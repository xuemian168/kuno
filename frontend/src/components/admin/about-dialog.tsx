"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  X, 
  Code2, 
  Globe, 
  Heart, 
  Star, 
  Github,
  ExternalLink,
  Calendar,
  Hash,
  Zap
} from "lucide-react"
import { getAppVersion, APP_INFO } from "@/lib/version"

interface AboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locale: string
}


export function AboutDialog({ open, onOpenChange, locale }: AboutDialogProps) {
  const t = locale === 'zh'
  const versionInfo = getAppVersion()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 dark:from-violet-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 border border-violet-200 dark:border-violet-800">
        <DialogHeader className="text-center pb-6">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-500 shadow-2xl">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1
              }}
            >
              <Code2 className="h-10 w-10 text-white" />
            </motion.div>
          </div>
          
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent text-center">
            {versionInfo.name}
          </DialogTitle>
          
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <Badge variant="secondary" className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
              <Star className="h-3 w-3 mr-1" />
              v{versionInfo.version}
            </Badge>
            <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
              <Hash className="h-3 w-3 mr-1" />
              {versionInfo.build}
            </Badge>
            <Badge variant="outline" className="border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300">
              <Calendar className="h-3 w-3 mr-1" />
              {versionInfo.buildDate}
            </Badge>
            {versionInfo.commit && (
              <Badge variant="outline" className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                <Github className="h-3 w-3 mr-1" />
                {versionInfo.commit}
              </Badge>
            )}
            {versionInfo.branch && versionInfo.branch !== 'main' && (
              <Badge variant="outline" className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300">
                {versionInfo.branch}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Description */}
          <div className="text-center">
            <p className="text-muted-foreground leading-relaxed text-lg">
              {t ? APP_INFO.description.zh : APP_INFO.description.en}
            </p>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-violet-300 to-transparent" />

          {/* Features */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-violet-900 dark:text-violet-100">
              <Zap className="h-5 w-5" />
              {t ? '主要功能' : 'Key Features'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(t ? APP_INFO.features.zh : APP_INFO.features.en).map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-violet-200/50 dark:border-violet-800/50"
                >
                  <span className="text-lg">{feature.split(' ')[0]}</span>
                  <span className="text-sm text-muted-foreground">{feature.substring(feature.indexOf(' ') + 1)}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-blue-300 to-transparent" />

          {/* Tech Stack */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Globe className="h-5 w-5" />
              {t ? '技术栈' : 'Tech Stack'}
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 text-blue-700 dark:text-blue-300">
                  {t ? '前端' : 'Frontend'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {APP_INFO.techStack.frontend.map((tech) => (
                    <Badge key={tech} variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-green-700 dark:text-green-300">
                  {t ? '后端' : 'Backend'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {APP_INFO.techStack.backend.map((tech) => (
                    <Badge key={tech} variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-orange-700 dark:text-orange-300">
                  {t ? '部署' : 'Deployment'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {APP_INFO.techStack.deployment.map((tech) => (
                    <Badge key={tech} variant="secondary" className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />

          {/* Footer Info */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-red-500" />
              <span>
                {t ? '由' : 'Made with'} <span className="text-red-500">❤️</span> {t ? '制作' : 'by'} <span className="font-medium text-violet-600 dark:text-violet-400">{APP_INFO.author}</span>
              </span>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(APP_INFO.repository, '_blank')}
                className="gap-2 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"
              >
                <Github className="h-4 w-4" />
                {t ? '源代码' : 'Source Code'}
                <ExternalLink className="h-3 w-3" />
              </Button>
              
              <Badge variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                {APP_INFO.license} License
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-8 pt-6 border-t border-violet-200 dark:border-violet-800">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-2 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"
          >
            <X className="h-4 w-4" />
            {t ? '关闭' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}