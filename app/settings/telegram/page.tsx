'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  Grid,
  Divider,
  Container,
  Snackbar,
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import SendIcon from '@mui/icons-material/Send';

interface TelegramConfig {
  id?: number;
  userId?: number;
  botToken: string;
  chatId: string;
  enabled: boolean;
}

const defaultTelegramConfig: TelegramConfig = {
  botToken: '',
  chatId: '',
  enabled: true,
};

export default function TelegramSettingsPage() {
  const { isAuthenticated, token, hasPermission } = useAuth();
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(defaultTelegramConfig);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [openSnack, setOpenSnack] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!hasPermission('telegram.view')) return;
    fetchTelegramConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchTelegramConfig = async () => {
    try {
      const response = await fetch('/api/meetings/telegram-config', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      if (data.success) {
        // Fallback to default if no config exists (API returns null)
        const cfg: any = data.data ?? defaultTelegramConfig;
        // Ensure enabled is boolean (DB may return 0/1)
        cfg.enabled = !!cfg.enabled;
        setTelegramConfig(cfg);
      } else {
        console.error('Error fetching telegram config:', data.error);
      }
    } catch (err) {
      console.error('Error fetching telegram config:', err);
    }
  };

  const handleSave = async () => {
    if (!hasPermission('telegram.update')) {
      setError('Bạn không có quyền cập nhật cấu hình Telegram');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch('/api/meetings/telegram-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(telegramConfig),
      });
      const data = await response.json();
      if (data.success) {
        // Update local state with saved config (fallback and normalize enabled)
        const updated: any = data.data ?? defaultTelegramConfig;
        updated.enabled = !!updated.enabled;
        setTelegramConfig(updated);
        setSuccess('Đã lưu cấu hình Telegram');
        setOpenSnack(true);
      } else {
        setError(data.error || 'Lỗi lưu cấu hình');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu cấu hình');
    }
    setLoading(false);
  };

  const handleTest = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch('/api/meetings/telegram-config/test', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(data.message || 'Đã gửi tin nhắn test');
        setOpenSnack(true);
      } else {
        setError(data.error || 'Lỗi test Telegram');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi test Telegram');
    }
    setLoading(false);
  };

  if (!isAuthenticated) return null;

  if (!hasPermission('meetings.config')) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Container maxWidth="md">
            <Typography variant="h5">Cài đặt - Telegram</Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>Bạn không có quyền truy cập trang này.</Alert>
          </Container>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TelegramIcon color="primary" />
            <Typography variant="h5">Cài đặt Telegram</Typography>
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bot Token"
                value={telegramConfig.botToken}
                onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                helperText="Lấy từ @BotFather"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chat ID"
                value={telegramConfig.chatId}
                onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                helperText="ID của chat/group/channel"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={telegramConfig.enabled} onChange={(e) => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })} />}
                label="Bật thông báo Telegram"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={handleSave} disabled={loading || !telegramConfig.botToken || !telegramConfig.chatId || !hasPermission('telegram.update')} startIcon={<TelegramIcon />}>Lưu cấu hình</Button>
                <Button variant="outlined" startIcon={<SendIcon />} onClick={handleTest} disabled={loading || !telegramConfig.botToken || !telegramConfig.chatId || !hasPermission('telegram.update')}>Gửi test</Button>
              </Box>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Hướng dẫn:</Typography>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>Mở Telegram, tìm @BotFather</li>
              <li>Tạo bot và lấy Bot Token</li>
              <li>Gọi @userinfobot để lấy Chat ID hoặc lấy Chat ID từ group</li>
              <li>Điền Bot Token và Chat ID, bật thông báo nếu muốn</li>
            </ol>
          </Alert>

          <Snackbar open={openSnack} autoHideDuration={3000} onClose={() => setOpenSnack(false)} message={success || ''} />
        </Container>
      </Box>
    </Layout>
  );
}
