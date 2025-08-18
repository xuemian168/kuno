package search

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// SearchFilter represents a parsed search filter
type SearchFilter struct {
	Field    string      `json:"field"`    // title, content, category, author, date, views
	Operator string      `json:"operator"` // equals, contains, gt, lt, gte, lte, between
	Value    interface{} `json:"value"`    // search value
	Exclude  bool        `json:"exclude"`  // whether this is an exclusion filter
}

// ParsedQuery represents the complete parsed search query
type ParsedQuery struct {
	Filters   []SearchFilter `json:"filters"`
	FreeText  []string       `json:"free_text"`  // general search terms
	Logic     string         `json:"logic"`      // AND, OR
	SortBy    string         `json:"sort_by"`    // created_at, views, relevance
	SortOrder string         `json:"sort_order"` // ASC, DESC
}

// Advanced search syntax patterns
var (
	// Field-specific search: field:"value" or field:value
	fieldPattern = regexp.MustCompile(`(\w+):"([^"]+)"|(\w+):(\S+)`)

	// Quoted phrases: "exact phrase"
	quotedPattern = regexp.MustCompile(`"([^"]+)"`)

	// Date range: date:2024-01-01..2024-12-31 or date:>2024-01-01 or date:<2024-12-31
	datePattern = regexp.MustCompile(`date:([\d-]+)\.\.([\d-]+)|date:([><]=?)([\d-]+)`)

	// Numeric comparisons: views:>100, views:<=50
	numericPattern = regexp.MustCompile(`(views|view_count):([><]=?)(\d+)`)

	// Exclusion: -term
	exclusionPattern = regexp.MustCompile(`-(\S+)`)

	// Logic operators: AND, OR
	logicPattern = regexp.MustCompile(`\b(AND|OR)\b`)

	// Sort directive: sort:field:order
	sortPattern = regexp.MustCompile(`sort:(\w+):(asc|desc)`)
)

// ParseSearchQuery parses advanced search syntax into structured filters
func ParseSearchQuery(query string) (*ParsedQuery, error) {
	parsed := &ParsedQuery{
		Filters:   []SearchFilter{},
		FreeText:  []string{},
		Logic:     "AND", // default logic
		SortBy:    "created_at",
		SortOrder: "DESC",
	}

	// Normalize the query
	query = strings.TrimSpace(query)
	if query == "" {
		return parsed, nil
	}

	remaining := query

	// 1. Extract sort directives
	if sortMatches := sortPattern.FindAllStringSubmatch(query, -1); len(sortMatches) > 0 {
		for _, match := range sortMatches {
			parsed.SortBy = match[1]
			parsed.SortOrder = strings.ToUpper(match[2])
			// Remove from remaining query
			remaining = strings.ReplaceAll(remaining, match[0], "")
		}
	}

	// 2. Extract field-specific searches
	if fieldMatches := fieldPattern.FindAllStringSubmatch(remaining, -1); len(fieldMatches) > 0 {
		for _, match := range fieldMatches {
			var field, value string
			if match[2] != "" { // quoted version: field:"value"
				field, value = match[1], match[2]
			} else { // unquoted version: field:value
				field, value = match[3], match[4]
			}

			filter := SearchFilter{
				Field:    field,
				Operator: "contains",
				Value:    value,
				Exclude:  false,
			}

			// Handle special field types
			switch field {
			case "category", "author":
				filter.Operator = "equals"
			case "title", "content", "summary":
				filter.Operator = "contains"
			}

			parsed.Filters = append(parsed.Filters, filter)
			// Remove from remaining query
			remaining = strings.ReplaceAll(remaining, match[0], "")
		}
	}

	// 3. Extract date range searches
	if dateMatches := datePattern.FindAllStringSubmatch(remaining, -1); len(dateMatches) > 0 {
		for _, match := range dateMatches {
			var filter SearchFilter

			if match[1] != "" && match[2] != "" { // Range format: date:start..end
				startDate, err1 := time.Parse("2006-01-02", match[1])
				endDate, err2 := time.Parse("2006-01-02", match[2])
				if err1 == nil && err2 == nil {
					filter = SearchFilter{
						Field:    "date",
						Operator: "between",
						Value:    []time.Time{startDate, endDate},
						Exclude:  false,
					}
				}
			} else if match[3] != "" && match[4] != "" { // Comparison format: date:>2024-01-01
				date, err := time.Parse("2006-01-02", match[4])
				if err == nil {
					operator := match[3]
					switch operator {
					case ">":
						operator = "gt"
					case ">=":
						operator = "gte"
					case "<":
						operator = "lt"
					case "<=":
						operator = "lte"
					}

					filter = SearchFilter{
						Field:    "date",
						Operator: operator,
						Value:    date,
						Exclude:  false,
					}
				}
			}

			if filter.Field != "" {
				parsed.Filters = append(parsed.Filters, filter)
				// Remove from remaining query
				remaining = strings.ReplaceAll(remaining, match[0], "")
			}
		}
	}

	// 4. Extract numeric comparisons (views)
	if numMatches := numericPattern.FindAllStringSubmatch(remaining, -1); len(numMatches) > 0 {
		for _, match := range numMatches {
			field := match[1]
			if field == "view_count" {
				field = "views" // normalize field name
			}

			operator := match[2]
			switch operator {
			case ">":
				operator = "gt"
			case ">=":
				operator = "gte"
			case "<":
				operator = "lt"
			case "<=":
				operator = "lte"
			}

			value, err := strconv.Atoi(match[3])
			if err == nil {
				filter := SearchFilter{
					Field:    field,
					Operator: operator,
					Value:    value,
					Exclude:  false,
				}
				parsed.Filters = append(parsed.Filters, filter)
				// Remove from remaining query
				remaining = strings.ReplaceAll(remaining, match[0], "")
			}
		}
	}

	// 5. Extract quoted phrases
	quotedTerms := quotedPattern.FindAllStringSubmatch(remaining, -1)
	for _, match := range quotedTerms {
		phrase := match[1]
		filter := SearchFilter{
			Field:    "content", // search in all text fields
			Operator: "phrase",
			Value:    phrase,
			Exclude:  false,
		}
		parsed.Filters = append(parsed.Filters, filter)
		// Remove from remaining query
		remaining = strings.ReplaceAll(remaining, match[0], "")
	}

	// 6. Extract exclusions
	if exMatches := exclusionPattern.FindAllStringSubmatch(remaining, -1); len(exMatches) > 0 {
		for _, match := range exMatches {
			term := match[1]
			filter := SearchFilter{
				Field:    "content",
				Operator: "contains",
				Value:    term,
				Exclude:  true,
			}
			parsed.Filters = append(parsed.Filters, filter)
			// Remove from remaining query
			remaining = strings.ReplaceAll(remaining, match[0], "")
		}
	}

	// 7. Extract logic operators
	if logicMatches := logicPattern.FindAllString(remaining, -1); len(logicMatches) > 0 {
		// Use the last found logic operator
		parsed.Logic = logicMatches[len(logicMatches)-1]
		// Remove from remaining query
		for _, op := range logicMatches {
			remaining = strings.ReplaceAll(remaining, op, "")
		}
	}

	// 8. Extract remaining free text terms
	remaining = strings.TrimSpace(remaining)
	if remaining != "" {
		// Split by spaces and filter out empty strings
		terms := strings.Fields(remaining)
		for _, term := range terms {
			if term != "" {
				parsed.FreeText = append(parsed.FreeText, term)
			}
		}
	}

	return parsed, nil
}

// BuildSQLQuery converts parsed query into SQL conditions and parameters
func (pq *ParsedQuery) BuildSQLQuery() (string, []interface{}) {
	var conditions []string
	var params []interface{}

	// Handle field-specific filters
	for _, filter := range pq.Filters {
		condition, filterParams := buildFilterCondition(filter)
		if condition != "" {
			conditions = append(conditions, condition)
			params = append(params, filterParams...)
		}
	}

	// Handle free text search
	if len(pq.FreeText) > 0 {
		freeTextConditions := []string{}
		for _, term := range pq.FreeText {
			freeTextConditions = append(freeTextConditions,
				"(title LIKE ? OR content LIKE ? OR summary LIKE ? OR seo_title LIKE ? OR seo_description LIKE ? OR seo_keywords LIKE ?)")
			pattern := "%" + term + "%"
			params = append(params, pattern, pattern, pattern, pattern, pattern, pattern)
		}

		if len(freeTextConditions) > 0 {
			var freeTextSQL string
			if pq.Logic == "OR" {
				freeTextSQL = strings.Join(freeTextConditions, " OR ")
			} else {
				freeTextSQL = strings.Join(freeTextConditions, " AND ")
			}
			conditions = append(conditions, "("+freeTextSQL+")")
		}
	}

	// Combine all conditions
	var finalSQL string
	if len(conditions) > 0 {
		if pq.Logic == "OR" {
			finalSQL = strings.Join(conditions, " OR ")
		} else {
			finalSQL = strings.Join(conditions, " AND ")
		}
	}

	return finalSQL, params
}

// buildFilterCondition creates SQL condition for a single filter
func buildFilterCondition(filter SearchFilter) (string, []interface{}) {
	var condition string
	var params []interface{}

	switch filter.Field {
	case "title":
		switch filter.Operator {
		case "contains":
			condition = "title LIKE ?"
			params = append(params, "%"+filter.Value.(string)+"%")
		case "phrase":
			condition = "title LIKE ?"
			params = append(params, "%"+filter.Value.(string)+"%")
		case "equals":
			condition = "title = ?"
			params = append(params, filter.Value.(string))
		}

	case "content":
		switch filter.Operator {
		case "contains":
			condition = "content LIKE ?"
			params = append(params, "%"+filter.Value.(string)+"%")
		case "phrase":
			condition = "content LIKE ?"
			params = append(params, "%"+filter.Value.(string)+"%")
		}

	case "category":
		// Need to join with categories table
		condition = "category_id IN (SELECT id FROM categories WHERE name LIKE ?)"
		params = append(params, "%"+filter.Value.(string)+"%")

	case "date":
		switch filter.Operator {
		case "gt":
			condition = "created_at > ?"
			params = append(params, filter.Value.(time.Time))
		case "gte":
			condition = "created_at >= ?"
			params = append(params, filter.Value.(time.Time))
		case "lt":
			condition = "created_at < ?"
			params = append(params, filter.Value.(time.Time))
		case "lte":
			condition = "created_at <= ?"
			params = append(params, filter.Value.(time.Time))
		case "between":
			dates := filter.Value.([]time.Time)
			if len(dates) == 2 {
				condition = "created_at BETWEEN ? AND ?"
				params = append(params, dates[0], dates[1])
			}
		}

	case "views":
		switch filter.Operator {
		case "gt":
			condition = "view_count > ?"
			params = append(params, filter.Value.(int))
		case "gte":
			condition = "view_count >= ?"
			params = append(params, filter.Value.(int))
		case "lt":
			condition = "view_count < ?"
			params = append(params, filter.Value.(int))
		case "lte":
			condition = "view_count <= ?"
			params = append(params, filter.Value.(int))
		}
	}

	// Handle exclusion
	if filter.Exclude && condition != "" {
		condition = "NOT (" + condition + ")"
	}

	return condition, params
}

// GetSortClause returns the ORDER BY clause
func (pq *ParsedQuery) GetSortClause() string {
	switch pq.SortBy {
	case "views", "view_count":
		return fmt.Sprintf("view_count %s", pq.SortOrder)
	case "title":
		return fmt.Sprintf("title %s", pq.SortOrder)
	case "created_at", "date":
		return fmt.Sprintf("created_at %s", pq.SortOrder)
	default:
		return "created_at DESC" // default sort
	}
}

// ValidateQuery performs basic validation on the parsed query
func (pq *ParsedQuery) ValidateQuery() error {
	// Validate sort fields
	validSortFields := map[string]bool{
		"created_at": true,
		"date":       true,
		"views":      true,
		"view_count": true,
		"title":      true,
		"relevance":  true,
	}

	if !validSortFields[pq.SortBy] {
		return fmt.Errorf("invalid sort field: %s", pq.SortBy)
	}

	// Validate sort order
	if pq.SortOrder != "ASC" && pq.SortOrder != "DESC" {
		return fmt.Errorf("invalid sort order: %s", pq.SortOrder)
	}

	// Validate logic operator
	if pq.Logic != "AND" && pq.Logic != "OR" {
		return fmt.Errorf("invalid logic operator: %s", pq.Logic)
	}

	return nil
}
