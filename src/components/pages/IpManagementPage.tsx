import { Tabs } from 'antd'
import ArpTab from '../ip-management/ArpTab'
import NetworkTab from '../ip-management/NetworkTab'
import AnomalyTab from '../ip-management/AnomalyTab'
import OuiTab from '../ip-management/OuiTab'

const api = (window as any).api

export default function IpManagementPage() {
  return (
    <div style={{ padding: 16, height: '100%' }}>
      <Tabs
        defaultActiveKey="arp"
        items={[
          { key: 'arp', label: 'ARP 采集', children: <ArpTab api={api} /> },
          { key: 'network', label: '网段管理', children: <NetworkTab api={api} /> },
          { key: 'anomaly', label: '异常检测', children: <AnomalyTab api={api} /> },
          { key: 'oui', label: 'OUI 管理', children: <OuiTab api={api} /> },
        ]}
      />
    </div>
  )
}
