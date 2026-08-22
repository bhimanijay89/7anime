import { Check, Server } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../ui/Badge'
import './player.css'

export interface StreamServer {
  id: string
  name: string
  quality: string
  type: 'Sub' | 'Dub'
  ping: string
}

const servers: StreamServer[] = [
  { id: 's1', name: 'Server 1 (HD)', quality: '1080p HD', type: 'Sub', ping: '18ms' },
  { id: 's2', name: 'Server 2 (HD)', quality: '1080p HD', type: 'Dub', ping: '24ms' },
  { id: 's3', name: 'Server 3 (Fast)', quality: '720p Fast', type: 'Sub', ping: '32ms' },
]

export function ServerSelector({
  onSelectServer
}: {
  onSelectServer?: (server: StreamServer) => void
}) {
  const [activeServerId, setActiveServerId] = useState('s1')

  const handleSelect = (server: StreamServer) => {
    setActiveServerId(server.id)
    onSelectServer?.(server)
  }

  return (
    <div className="server-selector glass" aria-label="Stream servers">
      <div className="server-selector__header">
        <Server size={16} />
        <span>Stream Servers</span>
      </div>
      <div className="server-selector__list">
        {servers.map(server => {
          const active = server.id === activeServerId
          return (
            <button
              key={server.id}
              className={`server-chip ${active ? 'active' : ''}`}
              onClick={() => handleSelect(server)}
            >
              {active && <Check size={14} />}
              <strong>{server.name}</strong>
              <small>{server.quality}</small>
              <Badge tone={server.type === 'Sub' ? 'accent' : 'warning'}>
                {server.type}
              </Badge>
            </button>
          )
        })}
      </div>
    </div>
  )
}
