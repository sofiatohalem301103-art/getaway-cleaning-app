'use client';
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>404 - Page Not Found</h2>
      <p>Could not find requested resource</p>
    </div>
  );
}