import fs from 'node:fs'
import path from 'node:path'
import type {Plugin} from 'vite'

const readRequestBody = (req: import('node:http').IncomingMessage): Promise<string> =>
    new Promise((resolve, reject) => {
        let body = ''

        req.on('data', chunk => {
            body += chunk
        })
        req.on('end', () => resolve(body))
        req.on('error', reject)
    })

export function profilingSavePlugin(): Plugin {
    return {
        name: 'profiling-save',
        configureServer(server) {
            server.middlewares.use('/__profiling/save', async (req, res, next) => {
                if (req.method !== 'POST') {
                    next()
                    return
                }

                try {
                    const body = await readRequestBody(req)
                    const {label, session} = JSON.parse(body)
                    const profilingRoot = path.resolve(process.cwd(), 'profiling')
                    const sessionsDir = path.join(profilingRoot, 'sessions')

                    fs.mkdirSync(sessionsDir, {recursive: true})

                    const safeLabel = String(label || 'session').replace(/[^a-zA-Z0-9-_]/g, '_')
                    const iso = new Date().toISOString().replace(/[:.]/g, '-')
                    const sessionFileName = `${iso}-${safeLabel}.json`
                    const sessionPath = path.join(sessionsDir, sessionFileName)
                    const latestPath = path.join(profilingRoot, 'latest.json')
                    const content = JSON.stringify(session, null, 2)

                    fs.writeFileSync(sessionPath, content)
                    fs.writeFileSync(latestPath, content)

                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({
                        path: 'profiling/latest.json',
                        sessionPath: `profiling/sessions/${sessionFileName}`,
                    }))
                } catch (error) {
                    res.statusCode = 500
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({error: String(error)}))
                }
            })
        },
    }
}
