import { Box, Container, Typography } from '@mui/material';

export const Dashboard = () => {
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1">
          Welcome to your dashboard!
        </Typography>
      </Box>
    </Container>
  );
}; 