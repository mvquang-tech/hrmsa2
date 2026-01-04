'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { UserRole, LeaveSessions, SessionType } from '@/lib/types';
import {
  generateDateRange,
  calculateDaysFromSessions,
  normalizeSessions,
  convertArrayToSessions,
  initializeSessionsForDateRange,
  toggleSession,
  getSessionsForDate,
  hasSession,
  normalizeDate,
} from '@/lib/utils/leave-helpers';

interface Employee {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
}

interface Leave {
  id: number;
  employeeId: number;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  sessions?: LeaveSessions | string; // JSON string or object
  reason: string;
  status: string;
}

export default function LeavesPage() {
  const { isAuthenticated, token, user, isLoading, hasPermission } = useAuth();
  const router = useRouter();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Leave | null>(null);
  const [formData, setFormData] = useState<{
    employeeId: string;
    type: string;
    startDate: string;
    endDate: string;
    days: string;
    sessions: LeaveSessions;
    reason: string;
  }>({
    employeeId: '',
    type: 'annual',
    startDate: '',
    endDate: '',
    days: '',
    sessions: {},
    reason: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check permissions from RBAC
  const canCreate = hasPermission('leaves.create');
  const canUpdate = hasPermission('leaves.update');
  const canDelete = hasPermission('leaves.delete');
  const canApprove = hasPermission('leaves.approve');

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (token) {
      fetchLeaves();
      if (user?.role !== UserRole.EMPLOYEE) {
        fetchEmployees();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, isLoading, router, user]);

  const fetchEmployees = async () => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      const response = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data.data);
      } else {
        console.error('Failed to fetch employees:', data.error);
        if (data.error === 'Unauthorized') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchLeaves = async () => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      const response = await fetch('/api/leaves', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        // Sessions are already loaded as objects from API
        // Just normalize them to ensure consistent format
        const leavesWithSessions = data.data.data.map((leave: any) => {
          if (leave.sessions && typeof leave.sessions === 'object') {
            leave.sessions = normalizeSessions(leave.sessions);
          } else {
            leave.sessions = {};
          }
          return leave;
        });
        setLeaves(leavesWithSessions);
      } else {
        console.error('Failed to fetch leaves:', data.error);
        if (data.error === 'Unauthorized') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  };

  // Handle date range change
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newFormData = { ...formData, [field]: value };
    
    // Initialize sessions for new date range
    // Mặc định check cả Buổi sáng và Buổi chiều cho tất cả các ngày
    if (newFormData.startDate && newFormData.endDate) {
      const dates = generateDateRange(newFormData.startDate, newFormData.endDate);
      const sessions: LeaveSessions = {};
      
      dates.forEach(date => {
        // Mặc định check cả morning và afternoon
        sessions[date] = ['morning', 'afternoon'];
      });
      
      newFormData.sessions = sessions;
    } else {
      newFormData.sessions = {};
    }
    
    // Recalculate days
    newFormData.days = calculateDaysFromSessions(newFormData.sessions).toString();
    
    setFormData(newFormData);
  };

  // Handle session toggle
  const handleSessionToggle = (date: string, sessionType: SessionType) => {
    const newSessions = toggleSession(formData.sessions, date, sessionType);
    const calculatedDays = calculateDaysFromSessions(newSessions);
    
    setFormData({
      ...formData,
      sessions: newSessions,
      days: calculatedDays.toString(),
    });
  };

  const handleOpen = (leave?: Leave) => {
    if (leave && leave.status === 'pending') {
      setEditing(leave);
      
      const startDate = leave.startDate.split('T')[0];
      const endDate = leave.endDate.split('T')[0];
      
      // Initialize sessions for date range (all empty)
      const dates = generateDateRange(startDate, endDate);
      let sessions: LeaveSessions = {};
      
      // Initialize all dates with empty arrays
      dates.forEach(date => {
        sessions[date] = [];
      });
      
      // Load sessions from API (already in object format from leave_sessions table)
      if (leave.sessions && typeof leave.sessions === 'object' && !Array.isArray(leave.sessions)) {
        const sessionsObj = leave.sessions as LeaveSessions;
        // Normalize all date keys to YYYY-MM-DD
        const normalized: LeaveSessions = {};
        Object.keys(sessionsObj).forEach(key => {
          try {
            const normalizedKey = normalizeDate(key);
            const sessionArray = sessionsObj[key];
            if (Array.isArray(sessionArray) && sessionArray.length > 0) {
              // Filter only valid session types
              const validSessions = sessionArray.filter(
                (s: any) => s === 'morning' || s === 'afternoon'
              ) as SessionType[];
              if (validSessions.length > 0) {
                normalized[normalizedKey] = validSessions;
              }
            }
          } catch (e) {
            // Skip invalid date keys
          }
        });
        
        // Map normalized sessions to date range
        dates.forEach(date => {
          // Check if normalized sessions has this date
          if (normalized[date]) {
            sessions[date] = [...normalized[date]];
          } else {
            sessions[date] = [];
          }
        });
      }
      
      const days = typeof leave.days === 'number' ? leave.days : parseFloat(String(leave.days)) || 0;
      
      setFormData({
        employeeId: leave.employeeId.toString(),
        type: leave.type,
        startDate,
        endDate,
        days: days.toString(),
        sessions,
        reason: leave.reason,
      });
    } else {
      setEditing(null);
      setFormData({
        employeeId: user?.employeeId?.toString() || '',
        type: 'annual',
        startDate: '',
        endDate: '',
        days: '',
        sessions: {},
        reason: '',
      });
    }
    setOpen(true);
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const url = editing ? `/api/leaves/${editing.id}` : '/api/leaves';
      const method = editing ? 'PUT' : 'POST';
      
      // Normalize sessions before sending to API
      const normalizedSessions = normalizeSessions(formData.sessions);
      
      // Only include sessions that have at least one session selected
      const sessionsForApi: LeaveSessions = {};
      Object.keys(normalizedSessions).forEach(date => {
        if (normalizedSessions[date].length > 0) {
          sessionsForApi[date] = normalizedSessions[date];
        }
      });
      
      // Calculate days from sessions
      const calculatedDays = Object.keys(sessionsForApi).length > 0
        ? calculateDaysFromSessions(sessionsForApi)
        : parseFloat(formData.days) || 0.5;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: parseInt(formData.employeeId),
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          days: calculatedDays,
          sessions: Object.keys(sessionsForApi).length > 0 ? sessionsForApi : undefined,
          reason: formData.reason,
        }),
      });
      const data = await response.json();
      if (data.success) {
        handleClose();
        fetchLeaves();
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/leaves/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        fetchLeaves();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn này?')) return;
    try {
      const response = await fetch(`/api/leaves/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchLeaves();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Đã duyệt';
      case 'rejected':
        return 'Từ chối';
      default:
        return 'Chờ duyệt';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      annual: 'Phép năm',
      sick: 'Ốm đau',
      personal: 'Việc riêng',
      maternity: 'Thai sản',
      unpaid: 'Không lương',
    };
    return labels[type] || type;
  };

  if (!isAuthenticated) return null;

  // Check if user can edit/delete specific leave request
  const canEditItem = (leave: Leave) => {
    // Only allow editing pending requests
    if (leave.status !== 'pending') {
      return false;
    }
    // User can edit their own pending requests, or if they have update permission
    if (leave.employeeId === user?.employeeId) {
      return true;
    }
    return canUpdate;
  };

  const canDeleteItem = (leave: Leave) => {
    // User can delete their own pending requests, or if they have delete permission
    if (leave.employeeId === user?.employeeId && leave.status === 'pending') {
      return true;
    }
    return canDelete;
  };

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Nghỉ phép</Typography>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              Tạo đơn nghỉ phép
            </Button>
          )}
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nhân viên</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell>Từ ngày</TableCell>
                <TableCell>Đến ngày</TableCell>
                <TableCell>Số ngày</TableCell>
                <TableCell>Lý do</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaves.map((leave) => {
                const emp = employees.find((e) => e.id === leave.employeeId);
                const empName = emp ? `${emp.firstName} ${emp.lastName}` : `ID: ${leave.employeeId}`;
                return (
                  <TableRow key={leave.id}>
                    <TableCell>{empName}</TableCell>
                    <TableCell>{getTypeLabel(leave.type)}</TableCell>
                    <TableCell>{new Date(leave.startDate).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>{new Date(leave.endDate).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {(() => {
                            const days = typeof leave.days === 'number' ? leave.days : parseFloat(leave.days) || 0;
                            return days % 1 === 0 ? days : days.toFixed(1);
                          })()} ngày
                        </Typography>
                        {leave.sessions && typeof leave.sessions === 'object' && Object.keys(leave.sessions).length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {(() => {
                              const sessionList: string[] = [];
                              Object.entries(leave.sessions as LeaveSessions).forEach(([date, sessions]) => {
                                if (Array.isArray(sessions) && sessions.length > 0) {
                                  sessions.forEach((s: SessionType) => {
                                    const dateLabel = new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                                    sessionList.push(`${dateLabel} ${s === 'morning' ? 'Sáng' : 'Chiều'}`);
                                  });
                                }
                              });
                              return sessionList.join(', ');
                            })()}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{leave.reason}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(leave.status)}
                        color={getStatusColor(leave.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {canEditItem(leave) && (
                        <IconButton size="small" onClick={() => handleOpen(leave)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {canApprove && leave.status === 'pending' && (
                        <>
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleApprove(leave.id, 'approved')}
                          >
                            Duyệt
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleApprove(leave.id, 'rejected')}
                          >
                            Từ chối
                          </Button>
                        </>
                      )}
                      {canDeleteItem(leave) && (
                        <IconButton size="small" onClick={() => handleDelete(leave.id)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>{editing ? 'Sửa đơn nghỉ phép' : 'Tạo đơn nghỉ phép'}</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {user?.role !== UserRole.EMPLOYEE && (
              <TextField
                fullWidth
                select
                label="Nhân viên"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                margin="normal"
                required
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {`${emp.firstName} ${emp.lastName} (${emp.code})`}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              fullWidth
              select
              label="Loại nghỉ phép"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              margin="normal"
              required
            >
              <MenuItem value="annual">Phép năm</MenuItem>
              <MenuItem value="sick">Ốm đau</MenuItem>
              <MenuItem value="personal">Việc riêng</MenuItem>
              <MenuItem value="maternity">Thai sản</MenuItem>
              <MenuItem value="unpaid">Không lương</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Từ ngày"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="Đến ngày"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            
            {/* Hiển thị checkbox cho từng ngày */}
            {formData.startDate && formData.endDate && generateDateRange(formData.startDate, formData.endDate).length > 0 && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Chọn buổi nghỉ cho từng ngày:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {generateDateRange(formData.startDate, formData.endDate).map((date) => {
                    // Date from generateDateRange is already in YYYY-MM-DD format
                    const dateObj = new Date(date + 'T00:00:00');
                    const dateLabel = dateObj.toLocaleDateString('vi-VN', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit' 
                    });
                    
                    // Get sessions for this date - use empty array if not exists
                    const dateSessions = formData.sessions[date] || [];
                    const hasMorning = Array.isArray(dateSessions) && dateSessions.includes('morning');
                    const hasAfternoon = Array.isArray(dateSessions) && dateSessions.includes('afternoon');
                    
                    return (
                      <Paper 
                        key={date} 
                        elevation={1}
                        sx={{ 
                          p: 2, 
                          border: '1px solid', 
                          borderColor: hasMorning || hasAfternoon ? 'primary.main' : 'divider', 
                          borderRadius: 1,
                          backgroundColor: hasMorning || hasAfternoon ? 'action.selected' : 'background.paper'
                        }}
                      >
                        <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 'medium', color: 'text.primary' }}>
                          {dateLabel}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 3 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={hasMorning}
                                onChange={() => handleSessionToggle(date, 'morning')}
                                color="primary"
                              />
                            }
                            label="Buổi sáng (0.5 ngày)"
                            sx={{ 
                              '& .MuiFormControlLabel-label': { 
                                fontSize: '0.875rem',
                                userSelect: 'none'
                              }
                            }}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={hasAfternoon}
                                onChange={() => handleSessionToggle(date, 'afternoon')}
                                color="primary"
                              />
                            }
                            label="Buổi chiều (0.5 ngày)"
                            sx={{ 
                              '& .MuiFormControlLabel-label': { 
                                fontSize: '0.875rem',
                                userSelect: 'none'
                              }
                            }}
                          />
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            )}
            
            <TextField
              fullWidth
              label="Tổng số ngày nghỉ"
              type="number"
              value={formData.days}
              margin="normal"
              inputProps={{ 
                min: 0.5, 
                max: 365, 
                step: 0.5 
              }}
              helperText={`Tự động tính từ số buổi đã chọn: ${formData.days} ngày`}
              required
              disabled
              sx={{ 
                '& .MuiInputBase-input': { 
                  backgroundColor: 'action.disabledBackground',
                  fontWeight: 'bold'
                } 
              }}
            />
            <TextField
              fullWidth
              label="Lý do"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

