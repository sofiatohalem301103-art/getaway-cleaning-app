export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0F172A' }}>404 - Page Not Found</h1>
      <p style={{ color: '#64748B', marginTop: '10px' }}>The page you are looking for does not exist.</p>
      <a 
        href="/customer/booking" 
        style={{ 
          display: 'inline-block', 
          marginTop: '20px', 
          padding: '12px 24px', 
          backgroundColor: '#0F172A', 
          color: '#ffffff', 
          borderRadius: '12px', 
          textDecoration: 'none',
          fontWeight: 'bold'
        }}
      >
        Return to Booking
      </a>
    </div>
  );
}