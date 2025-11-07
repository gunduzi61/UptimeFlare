import { Box, Modal, Tooltip } from '@mantine/core'
import { MonitorState, MonitorTarget } from '@/types/config'
import { useState } from 'react'
import useResizeObserver from '@react-hook/resize-observer'
import moment from 'moment'
import { getColor } from '@/util/color'

export default function DetailBar({
  monitor,
  state,
}: {
  monitor: MonitorTarget
  state: MonitorState
}) {
  const [barRef, barRect] = useResizeObserver()
  const [modalOpened, setModalOpened] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modelContent, setModelContent] = useState(<div />)

  const overlapLen = (x1: number, x2: number, y1: number, y2: number) => {
    return Math.max(0, Math.min(x2, y2) - Math.max(x1, y1))
  }

  const uptimePercentBars = []

  const currentTime = Math.round(Date.now() / 1000)
  const monitorStartTime = state.incident[monitor.id][0].start[0]

  const todayStart = new Date()
  todayStart.setHours(todayStart.getHours(), 0, 0, 0)

  // Changed to 24-hour view
  for (let i = 23; i >= 0; i--) {
    const hourStart = Math.round(todayStart.getTime() / 1000) - i * 3600
    const hourEnd = hourStart + 3600

    const hourMonitorTime = overlapLen(hourStart, hourEnd, monitorStartTime, currentTime)
    let hourDownTime = 0

    let incidentReasons: string[] = []

    for (let incident of state.incident[monitor.id]) {
      const incidentStart = incident.start[0]
      const incidentEnd = incident.end ?? currentTime

      const overlap = overlapLen(hourStart, hourEnd, incidentStart, incidentEnd)
      hourDownTime += overlap

      if (overlap > 0) {
        for (let i = 0; i < incident.error.length; i++) {
          let partStart = incident.start[i]
          let partEnd =
            i === incident.error.length - 1 ? incident.end ?? currentTime : incident.start[i + 1]
          partStart = Math.max(partStart, hourStart)
          partEnd = Math.min(partEnd, hourEnd)

          if (overlapLen(hourStart, hourEnd, partStart, partEnd) > 0) {
            const startStr = new Date(partStart * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
            const endStr = new Date(partEnd * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
            incidentReasons.push(`[${startStr}-${endStr}] ${incident.error[i]}`)
          }
        }
      }
    }

    const hourPercent = (((hourMonitorTime - hourDownTime) / hourMonitorTime) * 100).toPrecision(4)

    uptimePercentBars.push(
      <Tooltip
        multiline
        key={i}
        events={{ hover: true, focus: false, touch: true }}
        label={
          Number.isNaN(Number(hourPercent)) ? (
            'No Data'
          ) : (
            <>
              <div>
                {hourPercent}% at{' '}
                {new Date(hourStart * 1000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              {hourDownTime > 0 && (
                <div>{`Down for ${moment.preciseDiff(
                  moment(0),
                  moment(hourDownTime * 1000)
                )} (click for detail)`}</div>
              )}
            </>
          )
        }
      >
        <div
          style={{
            height: '20px',
            width: '7px',
            background: getColor(hourPercent, false),
            borderRadius: '2px',
            marginLeft: '1px',
            marginRight: '1px',
          }}
          onClick={() => {
            if (hourDownTime > 0) {
              setModalTitle(
                `🚨 ${monitor.name} incidents at ${new Date(hourStart * 1000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              )
              setModelContent(
                <>
                  {incidentReasons.map((reason, index) => (
                    <div key={index}>{reason}</div>
                  ))}
                </>
              )
              setModalOpened(true)
            }
          }}
        />
      </Tooltip>
    )
  }

  return (
    <>
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={modalTitle}
        size={'40em'}
      >
        {modelContent}
      </Modal>
      <Box
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          marginTop: '10px',
          marginBottom: '5px',
        }}
        visibleFrom="540"
        ref={barRef}
      >
        {uptimePercentBars.slice(Math.floor(Math.max(9 * 24 - barRect.width, 0) / 9), 24)}
      </Box>
    </>
  )
}
