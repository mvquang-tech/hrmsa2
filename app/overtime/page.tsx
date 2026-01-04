'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import {
  Box,
  Avatar,
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
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import { UserRole } from '@/lib/types';

interface Employee {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
}

interface Overtime {
  id: number;
  employeeId: number;
  date?: string;
  hours?: number;
  total_hours?: number;
  days?: Array<{ id?: number; date: string; total_seconds?: number; slots?: Array<{ start_time?: string; end_time?: string; seconds?: number }> }>;
  reason: string;
  status: string;
}

export default function OvertimePage() {
  const { isAuthenticated, token, user, isLoading, hasPermission } = useAuth();
  const router = useRouter();
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Overtime | null>(null);
  const [formData, setFormData] = useState<{ employeeId: string; reason: string; date?: string; hours?: string }>({
    employeeId: '',
    reason: '',
    date: '',
    hours: '',
  });

  // Advanced batch days structure: [{ date: 'YYYY-MM-DD', slots: [{start:'HH:mm', end:'HH:mm'}...] }]
  const [days, setDays] = useState<Array<{date: string; slots: Array<{start: string; end: string}>}>>([]);
  const [calcTotals, setCalcTotals] = useState({ perDay: new Map<string, number>(), grandSeconds: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Detail view state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOvertime, setDetailOvertime] = useState<Overtime | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Helper to format seconds into hours string
  const formatSeconds = (seconds: number) => {
    const hours = seconds / 3600;
    return `${hours.toFixed(2)} giờ`;
  };

  // Recalculate totals whenever days change
  useEffect(() => {
    const perDay = new Map<string, number>();
    let grand = 0;
    days.forEach((d) => {
      let daySum = 0;
      d.slots.forEach((s) => {
        if (s.start && s.end) {
          const [sh, sm] = s.start.split(':').map((v) => parseInt(v, 10));
          const [eh, em] = s.end.split(':').map((v) => parseInt(v, 10));
          const startSec = sh * 3600 + sm * 60;
          const endSec = eh * 3600 + em * 60;
          if (!Number.isNaN(startSec) && !Number.isNaN(endSec) && endSec > startSec) {
            daySum += endSec - startSec;
          }
        }
      });
      perDay.set(d.date, daySum);
      grand += daySum;
    });
    setCalcTotals({ perDay, grandSeconds: grand });
  }, [days]);

  // Check permissions from RBAC
  const canCreate = hasPermission('overtime.create');
  const canUpdate = hasPermission('overtime.update');
  const canDelete = hasPermission('overtime.delete');
  const canApprove = hasPermission('overtime.approve');

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (token) {
      fetchOvertimes();
      // If logged in as an employee, fetch only their employee record so we can show their name
      if (user?.role === UserRole.EMPLOYEE && user.employeeId) {
        fetchEmployeeById(user.employeeId);
      } else if (user?.role !== UserRole.EMPLOYEE) {
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

  const fetchEmployeeById = async (id: number) => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      const response = await fetch(`/api/employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        // API returns single employee object in data.data
        setEmployees([data.data]);
      } else {
        console.error('Failed to fetch employee:', data.error);
        if (data.error === 'Unauthorized') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
    }
  };

  const fetchOvertimes = async () => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      const response = await fetch('/api/overtime', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setOvertimes(data.data.data);
      } else {
        console.error('Failed to fetch overtimes:', data.error);
        if (data.error === 'Unauthorized') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching overtimes:', err);
    }
  };

  const handleOpen = (ot?: Overtime) => {
    if (ot && ot.status === 'pending') {
      setEditing(ot);
      setFormData({
        employeeId: ot.employeeId.toString(),
        date: ot.date ? (ot.date as string).split('T')[0] : '',
        hours: ot.hours ? ot.hours.toString() : '',
        reason: ot.reason,
      });

      // If the overtime has days/slots stored, load them into the days state for batch editing
      if (ot.days && Array.isArray(ot.days) && ot.days.length > 0) {
        const mapped = ot.days.map((d) => ({
          date: d.date ? (d.date as string).split('T')[0] : '',
          slots: (d.slots && Array.isArray(d.slots) && d.slots.length > 0)
            ? d.slots.map((s: any) => ({
                start: s.start_time ? (s.start_time as string).slice(0, 5) : '07:00',
                end: s.end_time ? (s.end_time as string).slice(0, 5) : '11:00',
              }))
            : [{ start: '07:00', end: '11:00' }],
        }));
        setDays(mapped);
      } else {
        // editing a single existing overtime -> clear batch days
        setDays([]);
      }
    } else {
      setEditing(null);
      setFormData({
        employeeId: user?.employeeId?.toString() || '',
        date: '',
        hours: '',
        reason: '',
      });
      // preparing a new batch overtime: start with one day/slot
      setDays([{ date: '', slots: [{ start: '07:00', end: '11:00' }] }]);
    }
    setOpen(true);
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setError('');
    setDays([]);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      // Editing an existing single overtime
      if (editing) {
        const url = `/api/overtime/${editing.id}`;
        // If editing a multi-day request, send the days structure; otherwise send legacy date/hours
        const payload: any = {};
        if (days.length > 0) {
          payload.days = days.map((d) => ({ date: d.date, slots: d.slots.map((s) => ({ start: s.start, end: s.end })) }));
          payload.reason = formData.reason;
        } else {
          payload.date = formData.date;
          payload.hours = parseFloat(formData.hours || '0');
          payload.reason = formData.reason;
        }

        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (data.success) {
          handleClose();
          fetchOvertimes();
        } else {
          setError(data.error || 'Có lỗi xảy ra');
        }
      } else {
        // New submission: batch mode when days provided
        if (days.length > 0) {
          const response = await fetch('/api/overtime/batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              employeeId: parseInt(formData.employeeId),
              reason: formData.reason,
              days,
            }),
          });
          const data = await response.json();
          if (data.success) {
            handleClose();
            fetchOvertimes();
          } else {
            setError(data.error || 'Có lỗi xảy ra');
          }
        } else {
          setError('Vui lòng thêm ít nhất một ngày');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/overtime/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        fetchOvertimes();
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
      const response = await fetch(`/api/overtime/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchOvertimes();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleView = async (ot: Overtime) => {
    setDetailLoading(true);
    setDetailOvertime(null);
    try {
      const response = await fetch(`/api/overtime/${ot.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setDetailOvertime(data.data);
        setDetailOpen(true);
      } else {
        setError(data.error || 'Không thể tải chi tiết');
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi khi tải chi tiết');
    } finally {
      setDetailLoading(false);
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

  if (!isAuthenticated) return null;

  // Check if user can edit/delete specific overtime request
  const canEditItem = (ot: Overtime) => {
    // User can edit their own pending requests, or if they have update permission
    if (ot.employeeId === user?.employeeId && ot.status === 'pending') {
      return true;
    }
    return canUpdate;
  };

  const canDeleteItem = (ot: Overtime) => {
    // User can delete their own pending requests, or if they have delete permission
    if (ot.employeeId === user?.employeeId && ot.status === 'pending') {
      return true;
    }
    return canDelete;
  };

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Ngoài giờ</Typography>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              Tạo đơn ngoài giờ
            </Button>
          )}
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nhân viên</TableCell>
                <TableCell>Ngày</TableCell>
                <TableCell>Số giờ</TableCell>
                <TableCell>Lý do</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overtimes.map((ot) => {
                const emp = employees.find((e) => e.id === ot.employeeId);
                const empName = emp ? `${emp.firstName} ${emp.lastName}` : `ID: ${ot.employeeId}`;
                return (
                  <TableRow key={ot.id}>
                    <TableCell>{empName}</TableCell>
                    <TableCell>
                      {ot.days && ot.days.length > 1 ? (
                        <Tooltip title={ot.days.map((d: any) => new Date(d.date).toLocaleDateString('vi-VN')).join(', ')}>
                          <span>{ot.days.length} ngày</span>
                        </Tooltip>
                      ) : ot.days && ot.days.length === 1 ? (
                        new Date(ot.days[0].date).toLocaleDateString('vi-VN')
                      ) : ot.date ? (
                        new Date(ot.date).toLocaleDateString('vi-VN')
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{typeof ot.total_hours !== 'undefined' ? ot.total_hours : ot.hours}</TableCell>
                    <TableCell>{ot.reason}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(ot.status)}
                        color={getStatusColor(ot.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Xem chi tiết">
                        <IconButton size="small" onClick={() => handleView(ot)} aria-label="Xem chi tiết">
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>

                      {canEditItem(ot) && (
                        <IconButton size="small" onClick={() => handleOpen(ot)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {canApprove && ot.status === 'pending' && (
                        <>
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleApprove(ot.id, 'approved')}
                          >
                            Duyệt
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleApprove(ot.id, 'rejected')}
                          >
                            Từ chối
                          </Button>
                        </>
                      )}
                      {canDeleteItem(ot) && (
                        <IconButton size="small" onClick={() => handleDelete(ot.id)}>
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
          <DialogTitle>
            {editing ? 'Sửa đơn ngoài giờ' : 'Tạo đơn ngoài giờ'}
          </DialogTitle>
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
              label="Lý do"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              required
            />

            {(editing && days.length === 0) ? (
              <>
                <TextField
                  fullWidth
                  label="Ngày"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  fullWidth
                  label="Số giờ"
                  type="number"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  margin="normal"
                  required
                  inputProps={{ min: 0.5, step: 0.5 }}
                />
              </>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Danh sách ngày</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Mỗi ngày có thể thêm tối đa 4 thời điểm</Typography>

                {days.map((d, idx) => (
                  <Paper key={d.date + '-' + idx} sx={{ p: 2, mb: 2 }} elevation={1}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                      <TextField
                        label="Ngày"
                        type="date"
                        value={d.date}
                        onChange={(e) => {
                          const newDays = [...days];
                          newDays[idx].date = e.target.value;
                          setDays(newDays);
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {d.date ? new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'long' }) : ''}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Button color="error" onClick={() => { setDays(days.filter((_, i) => i !== idx)); }}>
                        Xóa ngày
                      </Button>
                    </Box>

                    {/* Slots */}
                    {d.slots.map((s, sidx) => (
                      <Box key={sidx} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                        <TextField
                          label={`Bắt đầu ${sidx + 1}`}
                          type="time"
                          value={s.start}
                          onChange={(e) => {
                            const newDays = [...days];
                            newDays[idx].slots[sidx].start = e.target.value;
                            setDays(newDays);
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          label={`Kết thúc ${sidx + 1}`}
                          type="time"
                          value={s.end}
                          onChange={(e) => {
                            const newDays = [...days];
                            newDays[idx].slots[sidx].end = e.target.value;
                            setDays(newDays);
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                        <Button color="error" onClick={() => {
                          const newDays = [...days];
                          newDays[idx].slots.splice(sidx, 1);
                          setDays(newDays);
                        }}>Xóa</Button>
                      </Box>
                    ))}

                    <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                      <Button
                        disabled={d.slots.length >= 4}
                        onClick={() => {
                          const newDays = [...days];
                          newDays[idx].slots.push({ start: '07:00', end: '11:00' });
                          setDays(newDays);
                        }}
                      >Thêm thời điểm</Button>
                      <Box sx={{ flex: 1 }} />
                      <Typography variant="body2" color="text.secondary">Tổng giờ ngày: {formatSeconds(calcTotals.perDay.get(d.date) || 0)}</Typography>
                    </Box>
                  </Paper>
                ))}

                <Button onClick={() => setDays([...days, { date: '', slots: [{ start: '07:00', end: '11:00' }] }])} startIcon={<AddIcon />}>Thêm ngày</Button>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Tổng cộng: {formatSeconds(calcTotals.grandSeconds)}</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={detailOpen} onClose={() => { setDetailOpen(false); setDetailOvertime(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>Chi tiết đơn ngoài giờ</DialogTitle>
          <DialogContent dividers>
            {detailLoading && <Typography>Đang tải...</Typography>}
            {!detailLoading && detailOvertime && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  {(() => {
                    const emp = employees.find((e) => e.id === detailOvertime.employeeId);
                    const initials = emp ? `${(emp.firstName||'').charAt(0)}${(emp.lastName||'').charAt(0)}` : 'U';
                    return (
                      <>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>{initials}</Avatar>
                        <Box>
                          <Typography variant="subtitle1">{emp ? `${emp.firstName} ${emp.lastName}` : `ID: ${detailOvertime.employeeId}`}</Typography>
                          <Typography variant="caption" color="text.secondary">{emp?.code ?? ''}</Typography>
                        </Box>
                      </>
                    );
                  })()}
                  <Box sx={{ flex: 1 }} />
                  <Chip label={getStatusLabel(detailOvertime.status)} color={getStatusColor(detailOvertime.status) as any} size="small" />
                </Box>
                <Paper sx={{ p: 1, backgroundColor: 'background.default', mb: 2 }} elevation={0}>
                  <Typography variant="body2" sx={{ m: 0 }}><strong>Lý do:</strong> {detailOvertime.reason}</Typography>
                </Paper>

                {detailOvertime.days && detailOvertime.days.length > 0 ? (
                  (() => {
                    // Helper to compute slot seconds
                    const slotSeconds = (s: any) => {
                      if (!s.start_time || !s.end_time) return 0;
                      const [sh, sm] = String(s.start_time).split(":").map((v: string) => parseInt(v, 10));
                      const [eh, em] = String(s.end_time).split(":").map((v: string) => parseInt(v, 10));
                      const startSec = sh * 3600 + sm * 60;
                      const endSec = eh * 3600 + em * 60;
                      return endSec > startSec ? endSec - startSec : 0;
                    };
                    let grandTotal = 0;
                    return (
                      <>
                        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}><EventIcon fontSize="small" color="action" />Danh sách ngày</Typography>
                        <Box>
                          {detailOvertime.days.map((d: any) => {
                            const slots = Array.isArray(d.slots) ? d.slots : [];
                            let dayTotal = 0;
                            return (
                              <Paper key={d.date} sx={{ p: 2, mb: 2, borderLeft: '6px solid', borderColor: 'primary.main' }} elevation={1}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{new Date(d.date).toLocaleDateString('vi-VN')}</Typography>
                                    <Typography variant="caption" color="text.secondary">{new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'long' })}</Typography>
                                  </Box>
                                  <Chip label={`${((d.total_seconds || 0) / 3600).toFixed(2)} giờ`} color="success" size="small" />
                                </Box>

                                <Box sx={{ mt: 1 }}>
                                  {slots.length > 0 ? slots.map((s: any, idx: number) => {
                                    const sec = slotSeconds(s);
                                    dayTotal += sec;
                                    return (
                                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <AccessTimeIcon fontSize="small" color="action" />
                                        <Typography variant="body2">{String(s.start_time).slice(0,5)} - {String(s.end_time).slice(0,5)}</Typography>
                                        <Chip label={`${(sec/3600).toFixed(2)} giờ`} size="small" variant="outlined" sx={{ ml: 1 }} />
                                      </Box>
                                    );
                                  }) : <Typography variant="body2">Không có thời điểm</Typography>}
                                </Box>

                                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  <Chip label={`${(dayTotal/3600).toFixed(2)} giờ`} color="success" size="small" />
                                </Box>

                                {(() => { grandTotal += dayTotal; return null; })()}
                              </Paper>
                            );
                          })}

                          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>Tổng cộng tất cả ngày:</Typography>
                            <Chip label={`${(grandTotal/3600).toFixed(2)} giờ`} color="error" size="medium" />
                          </Box>
                        </Box>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <Typography variant="body2"><strong>Ngày:</strong> {detailOvertime.date ? new Date(detailOvertime.date).toLocaleDateString('vi-VN') : '-'}</Typography>
                    <Typography variant="body2"><strong>Số giờ:</strong> {typeof detailOvertime.total_hours !== 'undefined' ? detailOvertime.total_hours : detailOvertime.hours}</Typography>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setDetailOpen(false); setDetailOvertime(null); }}>Đóng</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

