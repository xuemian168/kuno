import { NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, paths, tag, secret } = body

    // 验证密钥
    const expectedSecret = process.env.REVALIDATION_SECRET
    if (!expectedSecret) {
      return Response.json(
        { message: 'Revalidation secret not configured' },
        { status: 500 }
      )
    }

    if (secret !== expectedSecret) {
      return Response.json(
        { message: 'Invalid secret' },
        { status: 401 }
      )
    }

    // 支持单个路径重新验证
    if (path) {
      await revalidatePath(path)
      console.log(`[ISR] Revalidated path: ${path}`)
    }

    // 支持批量路径重新验证
    if (paths && Array.isArray(paths)) {
      for (const p of paths) {
        await revalidatePath(p)
        console.log(`[ISR] Revalidated path: ${p}`)
      }
    }

    // 支持标签重新验证
    if (tag) {
      await revalidateTag(tag)
      console.log(`[ISR] Revalidated tag: ${tag}`)
    }

    return Response.json({
      revalidated: true,
      now: Date.now(),
      paths: paths || (path ? [path] : []),
      tag: tag || null
    })
  } catch (err) {
    console.error('[ISR] Error revalidating:', err)
    return Response.json(
      { message: 'Error revalidating', error: String(err) },
      { status: 500 }
    )
  }
}

// 支持 GET 方法进行测试
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')
  const path = url.searchParams.get('path')

  if (!process.env.REVALIDATION_SECRET) {
    return Response.json(
      { message: 'Revalidation secret not configured' },
      { status: 500 }
    )
  }

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json(
      { message: 'Invalid secret' },
      { status: 401 }
    )
  }

  if (path) {
    await revalidatePath(path)
    console.log(`[ISR] Revalidated path via GET: ${path}`)
    return Response.json({
      revalidated: true,
      path,
      now: Date.now()
    })
  }

  return Response.json({
    message: 'Revalidation API is working',
    usage: {
      POST: '/api/revalidate with { path, secret } or { paths, secret } or { tag, secret }',
      GET: '/api/revalidate?path=/some/path&secret=your-secret'
    }
  })
}