'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiClient, type UpdateInfo } from '@/lib/api'
import { AlertTriangle, CheckCircle, Download, ExternalLink, Info, Loader2 } from 'lucide-react'

const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 10 * 60_000
const RELOAD_DELAY_MS = 2_000
const SETUP_GUIDE_URL = 'https://github.com/xuemian168/kuno#one-click-update'

type Phase =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'triggering' }
  | { kind: 'waiting'; version: string; file: string }
  | { kind: 'succeeded'; version: string }
  | { kind: 'timedOut'; version: string }
  | { kind: 'failed'; error: string }

// apiClient errors look like "API request failed: 502 Bad Gateway - <server message>".
function serverMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  const separator = message.indexOf(' - ')
  return separator >= 0 ? message.slice(separator + 3) : message
}

export function SelfUpdatePanel({ updateInfo }: { updateInfo: UpdateInfo }) {
  const t = useTranslations()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const waitingFor = phase.kind === 'waiting' ? phase.version : null

  // While Watchtower replaces the container, poll the public version endpoint.
  // Requests fail during the restart; that is expected and ignored.
  useEffect(() => {
    if (!waitingFor) return
    const deadline = Date.now() + POLL_TIMEOUT_MS
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      try {
        const { system_info } = await apiClient.getSystemInfo()
        if (!cancelled && system_info?.version === waitingFor) {
          setPhase({ kind: 'succeeded', version: waitingFor })
          return
        }
      } catch {
        // The container is restarting.
      }
      if (cancelled) return
      if (Date.now() >= deadline) {
        setPhase({ kind: 'timedOut', version: waitingFor })
        return
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [waitingFor])

  useEffect(() => {
    if (phase.kind !== 'succeeded') return
    const timer = setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
    return () => clearTimeout(timer)
  }, [phase.kind])

  if (!updateInfo.has_update) return null

  const startUpdate = async () => {
    setPhase({ kind: 'triggering' })
    try {
      const result = await apiClient.triggerSelfUpdate()
      setPhase({ kind: 'waiting', version: result.to_version, file: result.backup_file })
    } catch (err) {
      setPhase({ kind: 'failed', error: serverMessage(err) })
    }
  }

  const { self_update: status } = updateInfo
  const canStart = status.available && (phase.kind === 'idle' || phase.kind === 'failed')

  return (
    <div className="space-y-3">
      {status.reason === 'not_configured' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-2">
            <p>{t('system.selfUpdateNotConfigured')}</p>
            <a
              href={SETUP_GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
            >
              <ExternalLink className="h-3 w-3" />
              {t('system.selfUpdateSetupGuide')}
            </a>
          </AlertDescription>
        </Alert>
      )}

      {status.reason === 'in_progress' && phase.kind === 'idle' && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription className="text-sm">{t('system.selfUpdateInProgress')}</AlertDescription>
        </Alert>
      )}

      {status.available && (phase.kind === 'idle' || phase.kind === 'confirming' || phase.kind === 'triggering' || phase.kind === 'failed') && (
        <Button
          size="sm"
          onClick={() => setPhase({ kind: 'confirming' })}
          disabled={!canStart}
        >
          {phase.kind === 'triggering' ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Download className="h-3 w-3 mr-1" />
          )}
          {t('system.updateNow')}
        </Button>
      )}

      {phase.kind === 'waiting' && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription className="text-sm">
            {t('system.selfUpdateWaiting', { version: phase.version, file: phase.file })}
          </AlertDescription>
        </Alert>
      )}

      {phase.kind === 'succeeded' && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {t('system.selfUpdateSucceeded', { version: phase.version })}
          </AlertDescription>
        </Alert>
      )}

      {phase.kind === 'timedOut' && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {t('system.selfUpdateTimedOut', { version: phase.version })}
          </AlertDescription>
        </Alert>
      )}

      {phase.kind === 'failed' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {t('system.selfUpdateFailed', { error: phase.error })}
          </AlertDescription>
        </Alert>
      )}

      <Dialog
        open={phase.kind === 'confirming'}
        onOpenChange={(open) => {
          if (!open && phase.kind === 'confirming') setPhase({ kind: 'idle' })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('system.selfUpdateConfirmTitle', { version: updateInfo.latest_version })}
            </DialogTitle>
            <DialogDescription>{t('system.selfUpdateConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhase({ kind: 'idle' })}>
              {t('common.cancel')}
            </Button>
            <Button onClick={startUpdate}>{t('system.selfUpdateConfirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
