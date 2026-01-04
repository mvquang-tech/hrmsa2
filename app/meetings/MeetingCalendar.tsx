import React, { useMemo } from 'react';
import { Box, Paper, Typography, IconButton, Badge, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import { ChevronLeft, ChevronRight, AddCircleOutline as AddIcon, Today as TodayIcon } from '@mui/icons-material';

export type MiniMeeting = {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  isRead?: boolean;
};

export default function MeetingCalendar({
  monthDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onDayClick,
  onCreateDay,
  meetings,
}: {
  monthDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday?: () => void;
  onDayClick: (date: string) => void;
  onCreateDay?: (date: string) => void;
  meetings: MiniMeeting[];
}) {
  const startOfMonth = useMemo(() => new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), [monthDate]);

  const monthLabel = startOfMonth.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  // Generate 6x7 grid days (week starts on Monday)
  const days = useMemo(() => {
    // convert JS getDay() (0=Sun..6=Sat) to Monday-based index (0=Mon..6=Sun)
    const firstDayIndex = (startOfMonth.getDay() + 6) % 7; // 0=Monday
    const start = new Date(startOfMonth);
    start.setDate(start.getDate() - firstDayIndex);

    const arr = [] as Date[];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startOfMonth]);

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, MiniMeeting[]>();
    for (const m of meetings) {
      const list = map.get(m.date) || [];
      list.push(m);
      map.set(m.date, list);
    }
    return map;
  }, [meetings]);

  const formatDay = (d: Date) => {
    return String(d.getDate());
  };

  const toYmd = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onPrevMonth} aria-label="Tháng trước" size="small"><ChevronLeft /></IconButton>
          <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>{monthLabel}</Typography>
          <IconButton onClick={onNextMonth} aria-label="Tháng kế tiếp" size="small"><ChevronRight /></IconButton>
          {onToday && (
            <IconButton onClick={onToday} sx={{ ml: 1 }} aria-label="Chuyển về tháng hiện tại" size="small" title="Chuyển về tháng hiện tại"><TodayIcon /></IconButton>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">Những ngày có lịch hiển thị chấm — click để xem hoặc nhấn + để tạo</Typography>
      </Box>

      <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={isSmall ? 1 : 2}>
        {['T2','T3','T4','T5','T6','T7','CN'].map((label) => (
          <Box key={label} sx={{ width: '100%', textAlign: 'center', py: 1, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        ))}
      </Box>

      <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={isSmall ? 1 : 2} mt={1}>
        {days.map((d, idx) => {
          const ymd = toYmd(d);
          const dayMeetings = meetingsByDate.get(ymd) || [];
          const inMonth = d.getMonth() === startOfMonth.getMonth();
          const today = toYmd(new Date()) === ymd;

          return (
            <Box
              key={idx}
              sx={{
                p: 1.25,
                borderRadius: 2,
                cursor: 'pointer',
                backgroundColor: today ? 'action.selected' : inMonth ? 'background.paper' : 'action.hover',
                border: '1px solid',
                borderColor: today ? 'primary.main' : 'divider',
                boxShadow: 0,
                transition: 'transform 150ms ease, box-shadow 150ms ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: 3 },
                minHeight: isSmall ? 84 : 96,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                outline: 'none',
                '&:focus-visible': { boxShadow: '0 0 0 3px rgba(25,118,210,0.12)', borderColor: 'primary.main' },
                // Show add button only on hover or when the cell receives focus
                '&:hover .add-btn, &:focus-within .add-btn': {
                  opacity: 1,
                  transform: 'scale(1)',
                  pointerEvents: 'auto',
                }
              }}
              onClick={() => onDayClick(ymd)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDayClick(ymd); } }}
              aria-label={`Ngày ${ymd} (${dayMeetings.length} cuộc họp)`}
            >
              {/* Create button (small) - hidden by default, appears on hover/focus */}
              {onCreateDay && (
                <IconButton
                  className="add-btn"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onCreateDay(ymd); }}
                  sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper', zIndex: 2, opacity: 0, transform: 'scale(0.92)', transition: 'opacity 150ms ease, transform 150ms ease', pointerEvents: 'none' }}
                  aria-label={`Tạo cuộc họp ngày ${ymd}`}
                >
                  <AddIcon fontSize="small" color="primary" />
                </IconButton>
              )}

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color={inMonth ? 'text.primary' : 'text.secondary'} sx={{ fontWeight: today ? 700 : 500 }}>{formatDay(d)}</Typography>

                <Box display="flex" alignItems="center" gap={0.5}>
                  {dayMeetings.length > 0 && (
                    <Tooltip title={`${dayMeetings.length} cuộc họp`}>
                      <Box display="flex" alignItems="center" sx={{ gap: 0.5 }}>
                        {dayMeetings.slice(0, 3).map((m, i) => (
                          <Box key={m.id} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: m.isRead ? 'grey.400' : 'primary.main', boxShadow: 1 }} />
                        ))}
                        {dayMeetings.length > 3 && <Typography variant="caption" color="text.secondary">+{dayMeetings.length - 3}</Typography>}
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <Box mt={1} display="flex" flexDirection="column" gap={0.5}>
                {dayMeetings.slice(0, 2).map((m) => (
                  <Typography
                    key={m.id}
                    variant="caption"
                    title={m.title}
                    sx={{
                      color: m.isRead ? 'text.secondary' : 'text.primary',
                      fontWeight: m.isRead ? 400 : 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      maxWidth: '100%'
                    }}
                  >
                    {m.time ? `${m.time} ` : ''}{m.title}
                  </Typography>
                ))}
                {dayMeetings.length === 0 && <Typography variant="caption" color="text.secondary">&nbsp;</Typography>}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
