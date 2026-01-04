'use client';

import { useState, useEffect, useMemo } from 'react';
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
  MenuItem,
  Chip,
  Tooltip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Menu,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Collapse,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Employee {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfJoin: string;
  departmentId: number;
  position?: string;
  status: string;
  hasAccount?: boolean;
}

// Column configuration
interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  minWidth?: number;
}

const defaultColumns: ColumnConfig[] = [
  { id: 'code', label: 'Mã NV', visible: true, minWidth: 100 },
  { id: 'fullName', label: 'Họ tên', visible: true, minWidth: 150 },
  { id: 'email', label: 'Email', visible: true, minWidth: 180 },
  { id: 'phone', label: 'Điện thoại', visible: false, minWidth: 120 },
  { id: 'department', label: 'Phòng ban', visible: true, minWidth: 130 },
  { id: 'position', label: 'Chức vụ', visible: true, minWidth: 120 },
  { id: 'dateOfJoin', label: 'Ngày vào làm', visible: false, minWidth: 120 },
  { id: 'status', label: 'Trạng thái', visible: true, minWidth: 100 },
  { id: 'hasAccount', label: 'Tài khoản', visible: true, minWidth: 100 },
];

export default function EmployeesPage() {
  const { isAuthenticated, token, isLoading, hasPermission } = useAuth();
  
  // Check permissions from RBAC
  const canCreate = hasPermission('employees.create');
  const canUpdate = hasPermission('employees.update');
  const canDelete = hasPermission('employees.delete');
  const canCreateAccount = hasPermission('employees.create_account');
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfJoin: '',
    departmentId: '',
    position: '',
    status: 'active',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Account creation dialog
  const [accountOpen, setAccountOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [accountForm, setAccountForm] = useState({ username: '', password: '' });

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Column visibility
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (token) {
      fetchEmployees();
      fetchDepartments();
    }
  }, [isAuthenticated, token, isLoading, router]);

  const fetchDepartments = async () => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      const response = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data.data);
      } else {
        console.error('Failed to fetch departments:', data.error);
        if (data.error === 'Unauthorized') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

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

  const handleOpen = (emp?: Employee) => {
    if (emp) {
      setEditing(emp);
      setFormData({
        code: emp.code,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone || '',
        dateOfJoin: emp.dateOfJoin.split('T')[0],
        departmentId: emp.departmentId.toString(),
        position: emp.position || '',
        status: emp.status,
      });
    } else {
      setEditing(null);
      setFormData({
        code: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfJoin: '',
        departmentId: '',
        position: '',
        status: 'active',
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
      const url = editing ? `/api/employees/${editing.id}` : '/api/employees';
      const method = editing ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          departmentId: parseInt(formData.departmentId),
        }),
      });
      const data = await response.json();
      if (data.success) {
        handleClose();
        fetchEmployees();
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return;
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchEmployees();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  // Account management
  const handleAccountOpen = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setAccountForm({
      username: emp.code.toLowerCase(),
      password: '',
    });
    setAccountOpen(true);
    setError('');

    // Check if already has account
    try {
      const response = await fetch(`/api/employees/${emp.id}/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data.hasAccount) {
        setError(`Nhân viên đã có tài khoản: ${data.data.account.username}`);
      }
    } catch (err) {
      console.error('Error checking account:', err);
    }
  };

  const handleAccountClose = () => {
    setAccountOpen(false);
    setSelectedEmployee(null);
    setAccountForm({ username: '', password: '' });
    setError('');
  };

  const handleCreateAccount = async () => {
    if (!selectedEmployee) return;
    if (!accountForm.username || !accountForm.password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (accountForm.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}/account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(accountForm),
      });
      const data = await response.json();
      if (data.success) {
        handleAccountClose();
        setSuccess(`Tạo tài khoản thành công cho ${selectedEmployee.firstName} ${selectedEmployee.lastName}`);
        setTimeout(() => setSuccess(''), 5000);
        fetchEmployees();
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // Column visibility handlers
  const handleColumnMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColumnMenuAnchor(event.currentTarget);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchor(null);
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const isColumnVisible = (columnId: string) => {
    return columns.find(col => col.id === columnId)?.visible ?? true;
  };

  // Filter handlers
  const clearFilters = () => {
    setSearchTerm('');
    setFilterDepartment('all');
    setFilterStatus('all');
    setFilterAccount('all');
  };

  const hasActiveFilters = searchTerm || filterDepartment !== 'all' || filterStatus !== 'all' || filterAccount !== 'all';

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const matchesSearch = 
          emp.code.toLowerCase().includes(search) ||
          fullName.includes(search) ||
          emp.email.toLowerCase().includes(search) ||
          (emp.phone && emp.phone.includes(search)) ||
          (emp.position && emp.position.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      // Department filter
      if (filterDepartment !== 'all' && emp.departmentId.toString() !== filterDepartment) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && emp.status !== filterStatus) {
        return false;
      }

      // Account filter
      if (filterAccount !== 'all') {
        if (filterAccount === 'yes' && !emp.hasAccount) return false;
        if (filterAccount === 'no' && emp.hasAccount) return false;
      }

      return true;
    });
  }, [employees, searchTerm, filterDepartment, filterStatus, filterAccount]);

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <Box>
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Nhân sự</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
                Thêm nhân viên
              </Button>
            )}
          </Box>
        </Box>

        {/* Search and Filter Bar */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <TextField
              size="small"
              placeholder="Tìm kiếm theo mã, tên, email, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 300, flexGrow: 1, maxWidth: 400 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'contained' : 'outlined'}
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              color={hasActiveFilters ? 'primary' : 'inherit'}
              endIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              Bộ lọc {hasActiveFilters && `(${[filterDepartment !== 'all', filterStatus !== 'all', filterAccount !== 'all'].filter(Boolean).length})`}
            </Button>

            {/* Column Visibility */}
            <Tooltip title="Ẩn/Hiện cột">
              <IconButton onClick={handleColumnMenuOpen}>
                <ViewColumnIcon />
              </IconButton>
            </Tooltip>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                size="small"
                color="error"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </Button>
            )}
          </Box>

          {/* Expanded Filters */}
          <Collapse in={showFilters}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Phòng ban</InputLabel>
                  <Select
                    value={filterDepartment}
                    label="Phòng ban"
                    onChange={(e) => setFilterDepartment(e.target.value)}
                  >
                    <MenuItem value="all">Tất cả phòng ban</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={filterStatus}
                    label="Trạng thái"
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">Tất cả trạng thái</MenuItem>
                    <MenuItem value="active">Hoạt động</MenuItem>
                    <MenuItem value="inactive">Tạm nghỉ</MenuItem>
                    <MenuItem value="terminated">Đã nghỉ việc</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tài khoản</InputLabel>
                  <Select
                    value={filterAccount}
                    label="Tài khoản"
                    onChange={(e) => setFilterAccount(e.target.value)}
                  >
                    <MenuItem value="all">Tất cả</MenuItem>
                    <MenuItem value="yes">Đã có tài khoản</MenuItem>
                    <MenuItem value="no">Chưa có tài khoản</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Collapse>
        </Paper>

        {/* Results count */}
        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Hiển thị {filteredEmployees.length} / {employees.length} nhân viên
          </Typography>
        </Box>

        {/* Column Visibility Menu */}
        <Menu
          anchorEl={columnMenuAnchor}
          open={Boolean(columnMenuAnchor)}
          onClose={handleColumnMenuClose}
          PaperProps={{
            sx: { minWidth: 200, maxHeight: 400 }
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Ẩn/Hiện cột
            </Typography>
          </Box>
          <Divider />
          <FormGroup sx={{ px: 1 }}>
            {columns.map((col) => (
              <FormControlLabel
                key={col.id}
                control={
                  <Checkbox
                    checked={col.visible}
                    onChange={() => toggleColumnVisibility(col.id)}
                    size="small"
                  />
                }
                label={col.label}
                sx={{ 
                  mx: 0, 
                  '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } 
                }}
              />
            ))}
          </FormGroup>
        </Menu>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {isColumnVisible('code') && <TableCell>Mã NV</TableCell>}
                {isColumnVisible('fullName') && <TableCell>Họ tên</TableCell>}
                {isColumnVisible('email') && <TableCell>Email</TableCell>}
                {isColumnVisible('phone') && <TableCell>Điện thoại</TableCell>}
                {isColumnVisible('department') && <TableCell>Phòng ban</TableCell>}
                {isColumnVisible('position') && <TableCell>Chức vụ</TableCell>}
                {isColumnVisible('dateOfJoin') && <TableCell>Ngày vào làm</TableCell>}
                {isColumnVisible('status') && <TableCell>Trạng thái</TableCell>}
                {isColumnVisible('hasAccount') && <TableCell>Tài khoản</TableCell>}
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.filter(c => c.visible).length + 1} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {employees.length === 0 ? 'Chưa có nhân viên nào' : 'Không tìm thấy nhân viên phù hợp'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => {
                  const dept = departments.find((d) => d.id === emp.departmentId);
                  return (
                    <TableRow key={emp.id} hover>
                      {isColumnVisible('code') && <TableCell>{emp.code}</TableCell>}
                      {isColumnVisible('fullName') && <TableCell>{`${emp.firstName} ${emp.lastName}`}</TableCell>}
                      {isColumnVisible('email') && <TableCell>{emp.email}</TableCell>}
                      {isColumnVisible('phone') && <TableCell>{emp.phone || '-'}</TableCell>}
                      {isColumnVisible('department') && <TableCell>{dept?.name || '-'}</TableCell>}
                      {isColumnVisible('position') && <TableCell>{emp.position || '-'}</TableCell>}
                      {isColumnVisible('dateOfJoin') && (
                        <TableCell>
                          {new Date(emp.dateOfJoin).toLocaleDateString('vi-VN')}
                        </TableCell>
                      )}
                      {isColumnVisible('status') && (
                        <TableCell>
                          <Chip 
                            label={emp.status === 'active' ? 'Hoạt động' : emp.status === 'inactive' ? 'Tạm nghỉ' : 'Đã nghỉ'}
                            size="small"
                            color={emp.status === 'active' ? 'success' : emp.status === 'inactive' ? 'warning' : 'default'}
                          />
                        </TableCell>
                      )}
                      {isColumnVisible('hasAccount') && (
                        <TableCell>
                          {emp.hasAccount ? (
                            <Chip 
                              icon={<CheckCircleIcon />}
                              label="Đã có"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          ) : canCreateAccount ? (
                            <Tooltip title="Cấp tài khoản">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => handleAccountOpen(emp)}
                              >
                                <PersonAddIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Chip label="Chưa có" size="small" variant="outlined" />
                          )}
                        </TableCell>
                      )}
                      <TableCell align="right">
                        {canUpdate && (
                          <Tooltip title="Sửa">
                            <IconButton size="small" onClick={() => handleOpen(emp)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title="Xóa">
                            <IconButton size="small" color="error" onClick={() => handleDelete(emp.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle>{editing ? 'Sửa nhân viên' : 'Thêm nhân viên'}</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="Mã nhân viên"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Họ"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Tên"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Số điện thoại"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <TextField
                fullWidth
                label="Ngày vào làm"
                type="date"
                value={formData.dateOfJoin}
                onChange={(e) => setFormData({ ...formData, dateOfJoin: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                select
                label="Phòng ban"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                required
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                label="Chức vụ"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
              <TextField
                fullWidth
                select
                label="Trạng thái"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="inactive">Không hoạt động</MenuItem>
                <MenuItem value="terminated">Đã nghỉ việc</MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog cấp tài khoản */}
        <Dialog open={accountOpen} onClose={handleAccountClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            Cấp tài khoản đăng nhập
          </DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {selectedEmployee && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Nhân viên</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedEmployee.email}
                </Typography>
              </Box>
            )}
            <TextField
              autoFocus
              margin="dense"
              label="Tên đăng nhập"
              fullWidth
              value={accountForm.username}
              onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              helperText="Chỉ chứa chữ thường, số và dấu gạch dưới"
            />
            <TextField
              margin="dense"
              label="Mật khẩu"
              type="password"
              fullWidth
              value={accountForm.password}
              onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
              helperText="Tối thiểu 6 ký tự"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAccountClose}>Hủy</Button>
            <Button onClick={handleCreateAccount} variant="contained" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

