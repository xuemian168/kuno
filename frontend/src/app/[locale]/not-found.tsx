'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Home, 
  ArrowLeft, 
  Zap, 
  Search, 
  FileX, 
  Sparkles,
  Compass
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface FloatingElementProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  x?: number
  y?: number
}

function FloatingElement({ children, delay = 0, duration = 3, x = 0, y = -20 }: FloatingElementProps) {
  return (
    <motion.div
      animate={{
        y: [y, y - 10, y],
        x: [x, x + 5, x],
        rotate: [-1, 1, -1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
      className="absolute"
    >
      {children}
    </motion.div>
  )
}

function GlitchText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={{
        textShadow: [
          "0 0 0 transparent",
          "2px 0 0 #ff0000, -2px 0 0 #00ffff",
          "0 0 0 transparent",
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: "loop",
      }}
    >
      {children}
    </motion.div>
  )
}

export default function NotFound() {
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 12
      }
    }
  }

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="relative">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/30 via-blue-50/20 to-cyan-50/30 dark:from-violet-950/20 dark:via-blue-950/10 dark:to-cyan-950/20" />
        
        {/* Floating Geometric Shapes */}
        <FloatingElement delay={0} x={100} y={100}>
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-lg rotate-45 backdrop-blur-sm" />
        </FloatingElement>
        
        <FloatingElement delay={1} x={-50} y={200} duration={4}>
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/30 to-teal-500/30 rounded-full backdrop-blur-sm" />
        </FloatingElement>
        
        <FloatingElement delay={2} x={250} y={50} duration={5}>
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500/25 to-purple-500/25 rounded-full backdrop-blur-sm" />
        </FloatingElement>
        
        <FloatingElement delay={1.5} x={-100} y={300} duration={3.5}>
          <Sparkles className="w-6 h-6 text-yellow-500/40" />
        </FloatingElement>
        
        <FloatingElement delay={0.5} x={300} y={250} duration={4.5}>
          <Zap className="w-8 h-8 text-blue-500/30" />
        </FloatingElement>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center px-4 relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          {/* 404 Number with Glitch Effect */}
          <motion.div variants={itemVariants} className="relative">
            <GlitchText className="text-9xl md:text-[12rem] font-bold bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              404
            </GlitchText>
            <motion.div
              animate={{ 
                background: [
                  "linear-gradient(45deg, #8b5cf6, #3b82f6)",
                  "linear-gradient(45deg, #3b82f6, #06b6d4)",
                  "linear-gradient(45deg, #06b6d4, #8b5cf6)",
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 opacity-20 blur-3xl -z-10"
            />
          </motion.div>

          {/* Main Message */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <motion.div
                variants={pulseVariants}
                animate="pulse"
                className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg"
              >
                <FileX className="h-8 w-8 text-white" />
              </motion.div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {t('notFound.title') || 'Page Not Found'}
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('notFound.description') || 'The page you\'re looking for seems to have vanished into the digital void.'}
            </p>
          </motion.div>

          {/* Error Details Card */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-800/80 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">
                    {t('notFound.requestedPath') || 'Requested Path'}
                  </span>
                </div>
                <code className="block text-sm bg-secondary/50 px-4 py-2 rounded-lg font-mono text-center break-all">
                  {pathname}
                </code>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/">
              <Button 
                size="lg" 
                className="gap-3 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-4 text-lg group"
              >
                <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
                {t('notFound.backHome') || 'Back to Home'}
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => router.back()}
              className="gap-3 border-2 hover:bg-secondary/50 px-8 py-4 text-lg group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              {t('notFound.goBack') || 'Go Back'}
            </Button>
          </motion.div>

          {/* Additional Help */}
          <motion.div variants={itemVariants} className="pt-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Compass className="h-4 w-4" />
              <span className="text-sm">
                {t('notFound.helpText') || 'Need help? Try exploring our'}{' '}
                <Link href="/" className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 underline underline-offset-4 hover:underline-offset-2 transition-all">
                  {t('notFound.latestArticles') || 'latest articles'}
                </Link>
              </span>
            </div>
          </motion.div>

          {/* Decorative Elements */}
          <motion.div 
            variants={itemVariants}
            className="flex justify-center space-x-4 pt-4 opacity-60"
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                }}
                className="w-2 h-2 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full"
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}