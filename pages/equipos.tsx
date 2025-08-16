import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import Sidebar from '../components/Sidebar';

export default function Equipos({ role }: { role: string }) {
  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Equipos</h2>
        <p>Página de gestión de equipos.</p>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    return { props: { role: payload.role } };
  } catch {
    return { redirect: { destination: '/', permanent: false } };
  }
};
