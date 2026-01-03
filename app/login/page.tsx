'use client';

import { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  Divider,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        },
      }}
    >
      {/* Decorative circles */}
      <Box
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          top: -100,
          right: -100,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          bottom: -50,
          left: -50,
        }}
      />

      <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={800}>
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Logo & Title */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
                }}
              >
                <BusinessIcon sx={{ fontSize: 36, color: 'white' }} />
              </Box>
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                HRMS
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Hệ thống Quản lý Nhân sự
              </Typography>
            </Box>

            <Divider sx={{ mb: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                Đăng nhập tài khoản
              </Typography>
            </Divider>

            {/* Error Alert */}
            {error && (
              <Fade in>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      alignItems: 'center',
                    },
                  }}
                  onClose={() => setError('')}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Tên đăng nhập"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
                    },
                  },
                }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
                    },
                  },
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      size="small"
                      sx={{
                        color: '#667eea',
                        '&.Mui-checked': {
                          color: '#667eea',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Ghi nhớ đăng nhập
                    </Typography>
                  }
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: '#667eea',
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Quên mật khẩu?
                </Typography>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !username || !password}
                sx={{
                  mt: 2,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                    boxShadow: '0 15px 35px rgba(102, 126, 234, 0.5)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                    boxShadow: 'none',
                  },
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} sx={{ color: 'white' }} />
                    <span>Đang đăng nhập...</span>
                  </Box>
                ) : (
                  'Đăng nhập'
                )}
              </Button>
            </Box>

            {/* Footer */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                © 2024 HRMS - Human Resource Management System
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}

