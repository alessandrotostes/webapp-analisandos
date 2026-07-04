
import type { RentLog } from '../../types';
import { Table } from '../ui/Table';

interface RentTabProps {
  rentLogs: RentLog[];
  loadingRent: boolean;
  formatCurrency: (val: number) => string;
}

export function RentTab({
  rentLogs,
  loadingRent,
  formatCurrency
}: RentTabProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Custos com Sublocação de Consultório</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cálculo proporcional a R$ 30,00 por sessão presencial</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <Table
          columns={[
            { header: 'Paciente', accessor: (log: RentLog) => log.patientName },
            { header: 'Datas / Referência', accessor: (log: RentLog) => log.dateRef },
            { header: 'Quantidade de Sessões', accessor: (log: RentLog) => `${log.sessionsCount} sessões`, align: 'center' },
            { header: 'Total Pago ao Consultório', accessor: (log: RentLog) => formatCurrency(log.valuePaid), align: 'right' }
          ]}
          data={rentLogs}
          loading={loadingRent}
        />
      </div>
    </div>
  );
}
