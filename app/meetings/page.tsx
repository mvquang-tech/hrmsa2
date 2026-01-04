'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  Snackbar,
  Tab,
  Tabs,
  Card,
  CardContent,
  Grid,
  Tooltip,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Container,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Notes as NotesIcon,
  Notifications as NotificationIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  Today as TodayIcon,
  CalendarMonth as CalendarIcon,
  CalendarMonth as CalendarMonthIcon,
  Telegram as TelegramIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import MeetingDetailDialog from './MeetingDetailDialog';
import MeetingCalendar from './MeetingCalendar';
import { useAuth } from '@/hooks/useAuth';

interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  attendees?: string;
  notes?: string;
  reminderEnabled: boolean;
  reminderMinutes: number;
  reminderSent: boolean;
  status?: 'upcoming' | 'ongoing' | 'finished' | 'unknown';
  createdBy: number;
  creatorName?: string;
  creatorCode?: string;
  isRead?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TelegramConfig {
  id?: number;
  userId?: number;
  botToken: string;
  chatId: string;
  enabled: boolean;
}

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Sắp tới' },
  { value: 'ongoing', label: 'Đang họp' },
  { value: 'finished', label: 'Đã kết thúc' },
  { value: 'unknown', label: 'Không xác định' },
];

const defaultMeeting: Partial<Meeting> = {
  title: '',
  date: new Date().toISOString().split('T')[0],
  time: '09:00',
  duration: 60,
  location: '',
  attendees: '',
  notes: '',
  reminderEnabled: false,
  reminderMinutes: 15,
  status: 'upcoming',
};

const defaultTelegramConfig: TelegramConfig = {
  botToken: '',
  chatId: '',
  enabled: true,
};

export default function MeetingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Partial<Meeting>>(defaultMeeting);
  
  // Telegram config
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(defaultTelegramConfig);
  const [telegramLoading, setTelegramLoading] = useState(false);
  
  // View dialog (read/unread)
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayMeetings, setSelectedDayMeetings] = useState<Meeting[]>([]);

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Fetch meetings
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/meetings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        const normalized = (data.data || []).map((m: any) => {
          // normalize date to local YYYY-MM-DD (handles returned Date or ISO strings)
          let dateStr = m.date;
          try {
            const d = new Date(m.date);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dateStr = `${yyyy}-${mm}-${dd}`;
          } catch (e) {
            /* keep original */
          }

          const timeStr = (m.time || '').toString().slice(0, 5);

          return {
            ...m,
            date: dateStr,
            time: timeStr,
            reminderEnabled: !!m.reminderEnabled,
            reminderSent: !!m.reminderSent,
            reminderMinutes: Number(m.reminderMinutes) || 15,
            duration: Number(m.duration) || 60,
            isRead: !!m.isRead,
            status: m.status || 'upcoming',
          };
        });

        setMeetings(normalized);
      } else {
        setError(data.error || 'Lỗi tải danh sách cuộc họp');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Telegram config
  const fetchTelegramConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/meetings/telegram-config', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        setTelegramConfig(data.data);
      }
    } catch (err) {
      console.error('Error fetching telegram config:', err);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchMeetings();
      fetchTelegramConfig();
    }
  }, [authLoading, user]);

  // Filtered meetings
  const getLocalDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayMeetings = useMemo(() => {
    const today = getLocalDateString();
    return meetings.filter(m => m.date === today);
  }, [meetings]);

  const upcomingMeetings = useMemo(() => {
    const today = getLocalDateString();
    return meetings.filter(m => m.date >= today).sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [meetings]);

  // Handlers
  const handleOpenDialog = (meeting?: Meeting) => {
    if (meeting) {
      setIsEdit(true);
      // Normalize date and time so inputs (type=date/time) receive valid values
      const normalizedDate = meeting.date?.toString()?.includes('T')
        ? meeting.date.toString().split('T')[0]
        : meeting.date;
      const normalizedTime = meeting.time?.toString()?.slice(0, 5);

      // Coerce DB-returned numeric flags to proper types so validation accepts them
      const normalizedMeeting: Partial<Meeting> = {
        ...meeting,
        date: normalizedDate,
        time: normalizedTime,
        reminderEnabled: !!meeting.reminderEnabled,
        reminderSent: !!meeting.reminderSent,
        reminderMinutes: Number(meeting.reminderMinutes) || 15,
        duration: Number(meeting.duration) || 60,
        status: (meeting as any).status || 'upcoming',
      };

      setSelectedMeeting(normalizedMeeting);
    } else {
      setIsEdit(false);
      setSelectedMeeting(defaultMeeting);
    }
    setDialogOpen(true);
  }; 

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedMeeting(defaultMeeting);
  };

  const handleSaveMeeting = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = isEdit ? `/api/meetings/${selectedMeeting.id}` : '/api/meetings';
      const method = isEdit ? 'PUT' : 'POST';

      // Ensure payload types match API expectations (booleans/numbers)
      const payload: any = {
        ...selectedMeeting,
        duration: Number(selectedMeeting.duration),
        reminderMinutes: Number(selectedMeeting.reminderMinutes),
        reminderEnabled: !!selectedMeeting.reminderEnabled,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(isEdit ? 'Đã cập nhật cuộc họp' : 'Đã tạo cuộc họp mới');
        handleCloseDialog();
        fetchMeetings();
      } else {
        setError(data.error || 'Lỗi lưu cuộc họp');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối server');
    }
  };

  const handleDeleteMeeting = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/meetings/${selectedMeeting.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Đã xóa cuộc họp');
        setDeleteDialogOpen(false);
        fetchMeetings();
      } else {
        setError(data.error || 'Lỗi xóa cuộc họp');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối server');
    }
  };

  // View meeting details and mark as read
  const handleViewMeeting = async (meeting: Meeting) => {
    try {
      setViewingMeeting(meeting);
      setViewDialogOpen(true);

      // Mark as read on server
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/meetings/${meeting.id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, isRead: true } : m));
        setViewingMeeting(prev => prev ? { ...prev, isRead: true } : prev);
      }
    } catch (err) {
      console.error('Error marking meeting as read', err);
    }
  };

  const handleToggleRead = async (meeting: Meeting, markRead: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/meetings/${meeting.id}/read`, {
        method: markRead ? 'PUT' : 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, isRead: markRead } : m));
        if (viewingMeeting && viewingMeeting.id === meeting.id) setViewingMeeting({ ...meeting, isRead: markRead });
      } else {
        setError(data.error || 'Lỗi cập nhật trạng thái đọc');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối server');
    }
  };

  const handleSaveTelegramConfig = async () => {
    try {
      setTelegramLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/meetings/telegram-config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telegramConfig),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Đã lưu cấu hình Telegram');
      } else {
        setError(data.error || 'Lỗi lưu cấu hình');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối server');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      setTelegramLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/meetings/telegram-config/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
      } else {
        setError(data.error || 'Lỗi test Telegram');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối server');
    } finally {
      setTelegramLoading(false);
    }
  };

  // Format helpers
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getMeetingStatus = (meeting: Meeting) => {
    // Prefer stored status if provided
    const statusMap: Record<string, { label: string; color: 'info' | 'success' | 'default' }> = {
      upcoming: { label: 'Sắp tới', color: 'info' },
      ongoing: { label: 'Đang họp', color: 'success' },
      finished: { label: 'Đã kết thúc', color: 'default' },
      unknown: { label: 'Không xác định', color: 'default' },
    };

    if (meeting.status && statusMap[meeting.status]) {
      return statusMap[meeting.status];
    }

    const now = new Date();
    const dateStr = (meeting.date || '').toString();
    const timeStr = (meeting.time || '00:00').toString().slice(0, 5);

    const meetingStart = new Date(`${dateStr}T${timeStr}`);
    const durationMin = Number(meeting.duration) || 0;
    const meetingEnd = new Date(meetingStart.getTime() + durationMin * 60000);

    if (isNaN(meetingStart.getTime())) {
      return statusMap.unknown;
    }

    if (now < meetingStart) {
      return statusMap.upcoming;
    } else if (now >= meetingStart && now < meetingEnd) {
      return statusMap.ongoing;
    } else {
      return statusMap.finished;
    }
  };

  const canEditMeeting = (meeting: Meeting) => {
    if (!user) return false;
    if (['admin', 'hr'].includes(user.role)) return true;
    return meeting.createdBy === user.employeeId;
  };

  // Render meeting table
  const renderMeetingTable = (meetingList: Meeting[]) => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Tiêu đề</TableCell>
            <TableCell>Ngày</TableCell>
            <TableCell>Giờ</TableCell>
            <TableCell>Thời lượng</TableCell>
            <TableCell>Địa điểm</TableCell>
            <TableCell>Nhắc nhở</TableCell>
            <TableCell>Trạng thái</TableCell>
            <TableCell align="right">Thao tác</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {meetingList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Typography color="text.secondary" sx={{ py: 4 }}>
                  Không có cuộc họp nào
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            meetingList.map((meeting) => {
              const status = getMeetingStatus(meeting);
              return (
                <TableRow key={meeting.id} hover>
                  <TableCell>
                    <Box>
                      <Typography
                        fontWeight={500}
                        sx={{ cursor: 'pointer', color: meeting.isRead ? 'text.secondary' : 'text.primary' }}
                        onClick={() => handleViewMeeting(meeting)}
                      >
                        {meeting.title}
                      </Typography>
                      {meeting.attendees && (
                        <Typography variant="caption" color="text.secondary">
                          👥 {meeting.attendees}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(meeting.date)}</TableCell>
                  <TableCell>{meeting.time}</TableCell>
                  <TableCell>{meeting.duration} phút</TableCell>
                  <TableCell>{meeting.location || '-'}</TableCell>
                  <TableCell>
                    {meeting.reminderEnabled ? (
                      <Chip 
                        size="small" 
                        icon={<NotificationIcon />}
                        label={`${meeting.reminderMinutes} phút`}
                        color={meeting.reminderSent ? 'default' : 'primary'}
                        variant={meeting.reminderSent ? 'outlined' : 'filled'}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">Tắt</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      size="small" 
                      label={status.label} 
                      color={status.color}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canEditMeeting(meeting) && (
                      <>
                        <Tooltip title="Sửa">
                          <IconButton size="small" onClick={() => handleOpenDialog(meeting)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => {
                              setSelectedMeeting(meeting);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render Telegram config tab
  const renderTelegramConfig = () => (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TelegramIcon color="primary" />
        Cấu hình Telegram Bot
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Cấu hình bot Telegram để nhận thông báo nhắc nhở lịch họp. 
        Bạn cần tạo bot qua @BotFather và lấy Chat ID từ @userinfobot.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Bot Token"
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            value={telegramConfig.botToken}
            onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
            helperText="Lấy từ @BotFather khi tạo bot"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Chat ID"
            placeholder="-1001234567890 hoặc 123456789"
            value={telegramConfig.chatId}
            onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
            helperText="ID của chat/group/channel để nhận thông báo"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={telegramConfig.enabled}
                onChange={(e) => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })}
              />
            }
            label="Bật thông báo Telegram"
          />
        </Grid>
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleSaveTelegramConfig}
              disabled={telegramLoading || !telegramConfig.botToken || !telegramConfig.chatId}
            >
              Lưu cấu hình
            </Button>
            <Button
              variant="outlined"
              startIcon={<SendIcon />}
              onClick={handleTestTelegram}
              disabled={telegramLoading || !telegramConfig.botToken || !telegramConfig.chatId}
            >
              Gửi test
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Hướng dẫn:</Typography>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>Mở Telegram, tìm @BotFather</li>
          <li>Gửi /newbot và làm theo hướng dẫn</li>
          <li>Copy Bot Token được cấp</li>
          <li>Tìm @userinfobot để lấy Chat ID của bạn</li>
          <li>Hoặc thêm bot vào group/channel và lấy Chat ID từ đó</li>
        </ol>
      </Alert>
    </Box>
  );

  if (authLoading) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Container maxWidth="lg">
            <Typography>Đang tải...</Typography>
          </Container>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h4" fontWeight={600}>
              📅 Quản lý Lịch họp
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchMeetings}
                disabled={loading}
              >
                Làm mới
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Tạo cuộc họp
              </Button>
            </Box>
          </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TodayIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="h4">{todayMeetings.length}</Typography>
                    <Typography variant="body2" color="text.secondary">Hôm nay</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CalendarIcon color="info" fontSize="large" />
                  <Box>
                    <Typography variant="h4">{upcomingMeetings.length}</Typography>
                    <Typography variant="body2" color="text.secondary">Sắp tới</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EventIcon color="success" fontSize="large" />
                  <Box>
                    <Typography variant="h4">{meetings.length}</Typography>
                    <Typography variant="body2" color="text.secondary">Tổng cộng</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <NotificationIcon color="warning" fontSize="large" />
                  <Box>
                    <Typography variant="h4">
                      {meetings.filter(m => m.reminderEnabled && !m.reminderSent).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Chờ nhắc nhở</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab icon={<CalendarIcon />} label="Tất cả" iconPosition="start" />
            <Tab icon={<TodayIcon />} label={`Hôm nay (${todayMeetings.length})`} iconPosition="start" />
            <Tab icon={<CalendarMonthIcon />} label="Lịch" iconPosition="start" />
            <Tab icon={<SettingsIcon />} label="Cài đặt Telegram" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <Paper>
          {tabValue === 0 && renderMeetingTable(meetings)}
          {tabValue === 1 && renderMeetingTable(todayMeetings)}
          {tabValue === 2 && (
            <MeetingCalendar
              monthDate={currentMonth}
              onPrevMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              onNextMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              onToday={() => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
              onDayClick={(date: string) => {
                const list = meetings.filter(m => m.date === date);
                setSelectedDay(date);
                setSelectedDayMeetings(list);
                setDayDialogOpen(true);
              }}
              onCreateDay={(date: string) => {
                // Open create dialog prefilled with the clicked date and default time
                setIsEdit(false);
                setSelectedMeeting({ ...defaultMeeting, date, time: '09:00' });
                setDialogOpen(true);
              }}
              meetings={meetings.map(m => ({ id: m.id, title: m.title, date: m.date, time: m.time, isRead: m.isRead }))}
            />
          )}
          {tabValue === 3 && renderTelegramConfig()}
        </Paper>
        </Container>

        {/* Meeting Detail (polished) */}
        <MeetingDetailDialog
          open={viewDialogOpen}
          meeting={viewingMeeting as any}
          onClose={() => { setViewDialogOpen(false); setViewingMeeting(null); }}
          onEdit={(m) => {
            setViewDialogOpen(false);
            if (m) {
              setSelectedMeeting(m);
              setIsEdit(true);
              setDialogOpen(true);
            }
          }}
          onDelete={(m) => {
            setViewDialogOpen(false);
            if (m) {
              setSelectedMeeting(m);
              setDeleteDialogOpen(true);
            }
          }}
          onToggleRead={(markRead, m) => {
            if (m) handleToggleRead(m as any, markRead);
          }}
          onAddCalendar={(m) => {
            const meetingToAdd = m as any;
            if (!meetingToAdd) return;

            // Generate ICS content
            const start = new Date(`${meetingToAdd.date}T${meetingToAdd.time}`);
            const end = new Date(start.getTime() + (Number(meetingToAdd.duration) || 60) * 60000);
            const pad = (n:number) => String(n).padStart(2, '0');
            const toICSDate = (d:Date) => {
              return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
            };

            const ics = [
              'BEGIN:VCALENDAR',
              'VERSION:2.0',
              'PRODID:-//hrmsa2//EN',
              'BEGIN:VEVENT',
              `UID:meeting-${meetingToAdd.id}@hrm`,
              `DTSTAMP:${toICSDate(new Date())}`,
              `DTSTART:${toICSDate(start)}`,
              `DTEND:${toICSDate(end)}`,
              `SUMMARY:${meetingToAdd.title.replace(/\n/g, ' ')}`,
              `DESCRIPTION:${(meetingToAdd.notes||'').replace(/\n/g, '\\n')}`,
              `LOCATION:${meetingToAdd.location || ''}`,
              'END:VEVENT',
              'END:VCALENDAR'
            ].join('\r\n');

            const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${meetingToAdd.title || 'meeting'}.ics`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}
        />

        {/* Day meetings dialog */}
        <Dialog open={dayDialogOpen} onClose={() => setDayDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Cuộc họp ngày {selectedDay}</DialogTitle>
          <DialogContent>
            {selectedDayMeetings.length === 0 ? (
              <Typography color="text.secondary">Không có cuộc họp</Typography>
            ) : (
              selectedDayMeetings.map(m => (
                <Box key={m.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer' }} onClick={() => { setDayDialogOpen(false); handleViewMeeting(m); }}>
                  <Typography fontWeight={700} sx={{ color: m.isRead ? 'text.secondary' : 'text.primary' }}>{m.time} • {m.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{m.attendees || ''}</Typography>
                </Box>
              ))
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDayDialogOpen(false)}>Đóng</Button>
          </DialogActions>
        </Dialog>

        {/* Meeting Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {isEdit ? 'Sửa cuộc họp' : 'Tạo cuộc họp mới'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Tiêu đề cuộc họp *"
                value={selectedMeeting.title || ''}
                onChange={(e) => setSelectedMeeting({ ...selectedMeeting, title: e.target.value })}
              />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Ngày *"
                    value={selectedMeeting.date || ''}
                    onChange={(e) => setSelectedMeeting({ ...selectedMeeting, date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="time"
                    label="Giờ *"
                    value={selectedMeeting.time || ''}
                    onChange={(e) => setSelectedMeeting({ ...selectedMeeting, time: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <FormControl fullWidth>
                <InputLabel>Thời lượng</InputLabel>
                <Select
                  value={selectedMeeting.duration || 60}
                  label="Thời lượng"
                  onChange={(e) => setSelectedMeeting({ ...selectedMeeting, duration: e.target.value as number })}
                >
                  <MenuItem value={15}>15 phút</MenuItem>
                  <MenuItem value={30}>30 phút</MenuItem>
                  <MenuItem value={45}>45 phút</MenuItem>
                  <MenuItem value={60}>1 giờ</MenuItem>
                  <MenuItem value={90}>1.5 giờ</MenuItem>
                  <MenuItem value={120}>2 giờ</MenuItem>
                  <MenuItem value={180}>3 giờ</MenuItem>
                  <MenuItem value={240}>4 giờ</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={(selectedMeeting.status as string) || ''}
                  label="Trạng thái"
                  onChange={(e) => setSelectedMeeting({ ...selectedMeeting, status: e.target.value as any })}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Địa điểm"
                placeholder="Phòng họp A, Zoom, Google Meet..."
                value={selectedMeeting.location || ''}
                onChange={(e) => setSelectedMeeting({ ...selectedMeeting, location: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Người tham dự"
                placeholder="Nguyễn Văn A, Trần Thị B..."
                value={selectedMeeting.attendees || ''}
                onChange={(e) => setSelectedMeeting({ ...selectedMeeting, attendees: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PeopleIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Ghi chú / Nội dung"
                placeholder="Nội dung cuộc họp, agenda..."
                value={selectedMeeting.notes || ''}
                onChange={(e) => setSelectedMeeting({ ...selectedMeeting, notes: e.target.value })}
              />

              <Divider />

              <FormControlLabel
                control={
                  <Switch
                    checked={selectedMeeting.reminderEnabled || false}
                    onChange={(e) => setSelectedMeeting({ ...selectedMeeting, reminderEnabled: e.target.checked })}
                  />
                }
                label="Bật nhắc nhở qua Telegram"
              />

              {selectedMeeting.reminderEnabled && (
                <FormControl fullWidth>
                  <InputLabel>Nhắc trước</InputLabel>
                  <Select
                    value={selectedMeeting.reminderMinutes || 15}
                    label="Nhắc trước"
                    onChange={(e) => setSelectedMeeting({ ...selectedMeeting, reminderMinutes: e.target.value as number })}
                  >
                    <MenuItem value={5}>5 phút</MenuItem>
                    <MenuItem value={10}>10 phút</MenuItem>
                    <MenuItem value={15}>15 phút</MenuItem>
                    <MenuItem value={30}>30 phút</MenuItem>
                    <MenuItem value={60}>1 giờ</MenuItem>
                    <MenuItem value={120}>2 giờ</MenuItem>
                    <MenuItem value={1440}>1 ngày</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Hủy</Button>
            <Button 
              variant="contained" 
              onClick={handleSaveMeeting}
              disabled={!selectedMeeting.title || !selectedMeeting.date || !selectedMeeting.time}
            >
              {isEdit ? 'Cập nhật' : 'Tạo'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Xác nhận xóa</DialogTitle>
          <DialogContent>
            <Typography>
              Bạn có chắc muốn xóa cuộc họp "{selectedMeeting.title}"?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
            <Button variant="contained" color="error" onClick={handleDeleteMeeting}>
              Xóa
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbars */}
        <Snackbar
          open={!!error}
          autoHideDuration={5000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}
