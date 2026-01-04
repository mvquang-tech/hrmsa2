'use client';

import { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import TelegramIcon from '@mui/icons-material/Telegram';
import SecurityIcon from '@mui/icons-material/Security';
import GroupIcon from '@mui/icons-material/Group';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const drawerWidth = 240;

// Menu items with required permissions
const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', permission: 'dashboard.view' },
  { text: 'Nhân sự', icon: <PeopleIcon />, path: '/employees', permission: 'employees.view' },
  { text: 'Phòng ban', icon: <BusinessIcon />, path: '/departments', permission: 'departments.view' },
  { text: 'Ngoài giờ', icon: <AccessTimeIcon />, path: '/overtime', permission: 'overtime.view' },
  { text: 'Nghỉ phép', icon: <EventIcon />, path: '/leaves', permission: 'leaves.view' },
  { text: 'Lịch họp', icon: <CalendarMonthIcon />, path: '/meetings', permission: 'meetings.view' },
];

const adminMenuItems = [
  { text: 'Vai trò', icon: <SecurityIcon />, path: '/admin/roles', permission: 'roles.view' },
  { text: 'Người dùng', icon: <GroupIcon />, path: '/admin/users', permission: 'users.view' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user, hasPermission, hasAnyPermission } = useAuth();

  const isAdmin = user?.role === 'admin';
  
  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter(item => hasPermission(item.permission));
  const visibleAdminItems = adminMenuItems.filter(item => hasPermission(item.permission));
  const showAdminMenu = isAdmin || visibleAdminItems.length > 0;
  const [settingsOpen, setSettingsOpen] = useState(true);

  // Settings menu items
  const settingsItems = [
    { text: 'Telegram', icon: <TelegramIcon />, path: '/settings/telegram', permission: 'telegram.view' },
  ];
  const visibleSettingsItems = settingsItems.filter(item => hasPermission(item.permission));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          HRMS
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {visibleMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => {
                router.push(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      {visibleSettingsItems.length > 0 && (
        <>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setSettingsOpen(!settingsOpen)}>
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Cài đặt" />
                {settingsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {visibleSettingsItems.map((item) => (
                  <ListItem key={item.text} disablePadding>
                    <ListItemButton
                      sx={{ pl: 4 }}
                      selected={pathname === item.path}
                      onClick={() => {
                        router.push(item.path);
                        setMobileOpen(false);
                      }}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </List>
        </>
      )}

      {showAdminMenu && (
        <>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setAdminOpen(!adminOpen)}>
                <ListItemIcon>
                  <AdminPanelSettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Quản trị" />
                {adminOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={adminOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {visibleAdminItems.map((item) => (
                  <ListItem key={item.text} disablePadding>
                    <ListItemButton
                      sx={{ pl: 4 }}
                      selected={pathname === item.path}
                      onClick={() => {
                        router.push(item.path);
                        setMobileOpen(false);
                      }}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </List>
        </>
      )}
      
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Đăng xuất" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Hệ thống quản lý nhân sự
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

// Default export for compatibility with import Layout from '@/components/Layout'
export default Layout;


