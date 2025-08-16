import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & {
    variant?: 'default' | 'striped' | 'bordered'
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <div className="enhanced-table-container">
    <table
      ref={ref}
      className={cn(
        "enhanced-table",
        variant === 'striped' && 'enhanced-table-striped',
        variant === 'bordered' && 'enhanced-table-bordered',
        className
      )}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('enhanced-table-header', className)}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('enhanced-table-body', className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('enhanced-table-footer', className)}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn('enhanced-table-row', className)}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    sortable?: boolean
    align?: 'left' | 'center' | 'right'
  }
>(({ className, sortable, align = 'left', children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'enhanced-table-head',
      align === 'center' && 'text-center',
      align === 'right' && 'text-right',
      sortable && 'enhanced-table-head-sortable',
      className
    )}
    {...props}
  >
    {children}
  </th>
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & {
    align?: 'left' | 'center' | 'right'
    numeric?: boolean
  }
>(({ className, align, numeric, children, ...props }, ref) => {
  // Auto-detect numeric content if not explicitly set
  const isNumeric = numeric ?? (
    typeof children === 'string' && 
    /^[\d\s,.\-+$€¥£%]+$/.test(children.trim())
  )
  
  const finalAlign = align ?? (isNumeric ? 'right' : 'left')
  
  return (
    <td
      ref={ref}
      className={cn(
        'enhanced-table-cell',
        finalAlign === 'center' && 'text-center',
        finalAlign === 'right' && 'text-right',
        isNumeric && 'font-mono',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
})
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('enhanced-table-caption', className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}