import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { RefreshCw, Wifi, WifiOff, AlertCircle, Laptop, Smartphone, Link as LinkIcon, Unlink, User } from 'lucide-react';
import axios from 'axios';

const STATUS_STYLES = {
  online: 'bg-green-100 text-green-700',
  recently_seen: 'bg-blue-100 text-blue-700',
  unreachable: 'bg-yellow-100 text-yellow-700',
  offline: 'bg-gray-100 text-gray-600'
};

const SOURCE_STYLES = {
  arp_scan: 'bg-blue-50 text-blue-700',
  router_dhcp: 'bg-purple-50 text-purple-700',
  router_arp: 'bg-purple-50 text-purple-700',
  ping: 'bg-gray-50 text-gray-700'
};

const SOURCE_LABELS = {
  arp_scan: 'ARP Scan',
  router_dhcp: 'Router DHCP',
  router_arp: 'Router ARP',
  ping: 'Ping'
};

const AGENT_STATUS_STYLES = {
  online: 'text-green-600 bg-green-50',
  degraded: 'text-yellow-600 bg-yellow-50',
  offline: 'text-red-600 bg-red-50',
  error: 'text-gray-600 bg-gray-50',
  unknown: 'text-gray-600 bg-gray-50'
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-';
}

function formatTimeAgo(value) {
  if (!value) return '-';
  const seconds = Math.floor((new Date() - new Date(value)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function StatusBadge({ status }) {
  const statusLabels = {
    online: 'Online',
    recently_seen: 'Recently Seen',
    unreachable: 'Unreachable',
    offline: 'Offline'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function SourceBadge({ source }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_STYLES[source] || 'bg-gray-100 text-gray-600'}`}>
      {SOURCE_LABELS[source] || source}
    </span>
  );
}

function DeviceIcon({ deviceName, manufacturer }) {
  const name = deviceName?.toLowerCase() || '';
  const manu = manufacturer?.toLowerCase() || '';
  
  if (name.includes('phone') || name.includes('android') || name.includes('iphone') || manu.includes('samsung') || manu.includes('xiaomi')) {
    return <Smartphone className="w-4 h-4 text-gray-400" />;
  }
  if (name.includes('laptop') || name.includes('pc') || name.includes('desktop') || manu.includes('dell') || manu.includes('hp') || manu.includes('lenovo')) {
    return <Laptop className="w-4 h-4 text-gray-400" />;
  }
  return <Wifi className="w-4 h-4 text-gray-400" />;
}

export default function NetworkDevicesPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'network-devices', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      const response = await axios.get(`/api/v1/admin/network/devices?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true
  });

  // Fetch student info for each device
  const devices = data?.data?.devices || [];
  const agentHeartbeat = data?.data?.agentHeartbeat;
  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const recentlySeenCount = devices.filter((d) => d.status === 'recently_seen').length;
  const unreachableCount = devices.filter((d) => d.status === 'unreachable').length;

  const agentStatus = agentHeartbeat?.status || 'unknown';
  const lastSeen = agentHeartbeat?.lastSeen;

  const linkMutation = useMutation({
    mutationFn: async ({ networkDeviceId, studentId, deviceLabel }) => {
      const response = await axios.post(`/api/v1/admin/network/devices/${networkDeviceId}/link`, {
        studentId,
        deviceLabel
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Device linked to student');
      queryClient.invalidateQueries({ queryKey: ['admin', 'network-devices'] });
      setShowLinkModal(false);
      setSelectedDevice(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to link device');
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: async (networkDeviceId) => {
      const response = await axios.delete(`/api/v1/admin/network/devices/${networkDeviceId}/link`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Device unlinked from student');
      queryClient.invalidateQueries({ queryKey: ['admin', 'network-devices'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to unlink device');
    }
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wi-Fi Connected Devices</h1>
          <p className="text-sm text-gray-500 mt-1">Physical network devices discovered by local agent via ARP + ping validation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${AGENT_STATUS_STYLES[agentStatus]}`}>
            {agentStatus === 'online' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            Agent: {agentStatus.charAt(0).toUpperCase() + agentStatus.slice(1)}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Wifi className="w-4 h-4 text-green-600" />
            {onlineCount} online
          </div>
          {recentlySeenCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <AlertCircle className="w-4 h-4" />
              {recentlySeenCount} recently seen
            </div>
          )}
          {unreachableCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertCircle className="w-4 h-4" />
              {unreachableCount} unreachable
            </div>
          )}
        </div>
      </div>

      {agentStatus !== 'online' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Network agent status: {agentStatus}</p>
            {lastSeen && <p className="text-amber-700 mt-1">Last seen: {formatDate(lastSeen)}</p>}
            <p className="text-amber-600 mt-1">Device list may not reflect current network state.</p>
          </div>
        </div>
      )}

      <div className="card !p-4 flex flex-wrap items-center gap-3">
        <select className="input w-40 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All devices</option>
          <option value="online">Online only</option>
          <option value="recently_seen">Recently Seen</option>
          <option value="unreachable">Unreachable only</option>
          <option value="offline">Offline only</option>
        </select>
        <div className="flex-1" />
        <button 
          className="btn btn-secondary p-2" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'network-devices'] })}
          title="Refresh now"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {isError && (
          <div className="p-5 text-sm text-red-700 bg-red-50">
            {error.response?.data?.message || 'Unable to load network devices.'}
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Device', 'IP Address', 'MAC Address', 'Manufacturer', 'Source', 'Status', 'Linked Student', 'Last Seen', 'Actions'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    Loading network devices...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    No network devices found.
                  </td>
                </tr>
              ) : devices.map((device) => (
                <tr key={device._id || device.ipAddress} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <DeviceIcon deviceName={device.deviceName} manufacturer={device.manufacturer} />
                      <div>
                        <div className="font-medium text-gray-900">{device.deviceName}</div>
                        {device.hostname && device.hostname !== device.deviceName && (
                          <div className="text-xs text-gray-500">{device.hostname}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-gray-600">{device.ipAddress}</td>
                  <td className="px-4 py-4 font-mono text-xs text-gray-500">{device.macAddress || '-'}</td>
                  <td className="px-4 py-4 text-gray-600">{device.manufacturer || '-'}</td>
                  <td className="px-4 py-4"><SourceBadge source={device.source || 'arp_scan'} /></td>
                  <td className="px-4 py-4"><StatusBadge status={device.status} /></td>
                  <td className="px-4 py-4 text-gray-600">{device.linkedStudent ? device.linkedStudent.name : '-'}</td>
                  <td className="px-4 py-4 text-xs text-gray-600">
                    <div>{formatDate(device.lastSeen)}</div>
                    <div className="text-gray-400">{formatTimeAgo(device.lastSeenAt)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {device.linkedStudent ? (
                        <button 
                          className="p-2 text-red-600 hover:text-red-800" 
                          onClick={() => unlinkMutation.mutate(device._id)}
                          title="Unlink from student"
                        >
                          <Unlink className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          className="p-2 text-blue-600 hover:text-blue-800" 
                          onClick={() => { setSelectedDevice(device); setShowLinkModal(true); }}
                          title="Link to student"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {lastSeen && (
        <div className="text-xs text-gray-400 text-center">
          Last updated: {formatDate(lastSeen)} · Auto-refresh every 15s
        </div>
      )}

      {showLinkModal && selectedDevice && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/40" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white w-full max-w-md h-full sm:h-auto sm:rounded-lg p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Link Device to Student</h2>
              <button onClick={() => setShowLinkModal(false)}>
                <Unlink className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Device</div>
                <div className="font-medium">{selectedDevice.deviceName}</div>
                <div className="text-xs text-gray-500 mt-1">{selectedDevice.ipAddress}</div>
                <div className="text-xs text-gray-500">{selectedDevice.manufacturer}</div>
                <div className="text-xs text-gray-500 mt-1">Source: {SOURCE_LABELS[selectedDevice.source] || selectedDevice.source}</div>
              </div>
              
              <div>
                <label className="label">Student ID</label>
                <input 
                  type="text" 
                  id="studentId"
                  className="input"
                  placeholder="Enter student ID"
                />
              </div>
              
              <div>
                <label className="label">Device Label (Optional)</label>
                <input 
                  type="text" 
                  id="deviceLabel"
                  className="input"
                  placeholder="e.g., Rahul's Phone"
                />
                <p className="text-xs text-gray-500 mt-1">This is a manual label for your reference. It does not affect the detected device name.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                className="btn btn-secondary flex-1"
                onClick={() => setShowLinkModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary flex-1"
                disabled={linkMutation.isPending}
                onClick={() => {
                  const studentId = document.getElementById('studentId').value;
                  const deviceLabel = document.getElementById('deviceLabel').value;
                  if (!studentId) {
                    toast.error('Student ID is required');
                    return;
                  }
                  linkMutation.mutate({
                    networkDeviceId: selectedDevice._id,
                    studentId,
                    deviceLabel
                  });
                }}
              >
                {linkMutation.isPending ? 'Linking...' : 'Link Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
