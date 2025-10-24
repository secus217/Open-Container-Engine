// src/pages/DeploymentDetailPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import DashboardLayout from '../components/Layout/DashboardLayout';
import LogsPage from '../components/DeploymentDetail/LogsPage';
import { useNotifications } from '../context/NotificationContext';
import type { WebSocketMessage } from '../services/websocket';
import { analyzeContainerError } from '../utils/errorHandlers';
import {
  RocketLaunchIcon,
  CubeIcon,
  ServerIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  ArrowLeftIcon,
  StopIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  LinkIcon,
  EyeIcon,
  TrashIcon,
  CloudIcon,
  ChartBarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

type DeploymentStatus = 'pending' | 'running' | 'stopped' | 'failed' | 'updating' | 'scaling';

interface DeploymentDetails {
  id: string;
  user_id: string;
  app_name: string;
  image: string;
  port: number;
  env_vars: { [key: string]: string };
  replicas: number;
  resources: {
    cpu: string | null;
    memory: string | null;
  };
  health_check: any;
  status: DeploymentStatus;
  url: string;
  created_at: string;
  updated_at: string;
  deployed_at: string | null;
}

interface DeploymentLogs {
  timestamp: string;
  message: string;
}

interface DomainItem {
  id: string;
  domain: string;
  status: 'pending' | 'validating' | 'verified' | 'failed';
  created_at: string;
  verified_at?: string;
  ssl_status?: 'pending' | 'issued' | 'failed';
  ssl_expires_at?: string;
}

const DeploymentDetailPage: React.FC = () => {
  const { deploymentId } = useParams<{ deploymentId: string }>();
  const domainComingSoon = true; // Set to true to hide Domains tab for now
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState<DeploymentDetails | null>(null);
  const [logs, setLogs] = useState<DeploymentLogs[]>([]);
  console.log(logs);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'domains' | 'settings'>('overview');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // State for scaling
  const [scaleReplicas, setScaleReplicas] = useState(1);
  const [isScaling, setIsScaling] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const { addNotificationHandler } = useNotifications();

  // Environment Variables state
  const [envVars, setEnvVars] = useState<{ [key: string]: string }>({});
  const [isUpdatingEnv, setIsUpdatingEnv] = useState(false);
  const [showAddEnvForm, setShowAddEnvForm] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [editingEnvKey, setEditingEnvKey] = useState<string | null>(null);
  const [editingEnvValue, setEditingEnvValue] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, 'success');
    } catch (err) {
      showToast(`Failed to copy ${label}`, 'error');
    }
  };

  const fetchData = useCallback(async () => {
    if (!deploymentId) return;

    try {
      setLoading(true);
      const [detailsRes, logsRes, envRes] = await Promise.all([
        api.get(`/v1/deployments/${deploymentId}`),
        api.get(`/v1/deployments/${deploymentId}/logs`, { params: { tail: 100 } }),
        api.get(`/v1/deployments/${deploymentId}/env`)
      ]);
      setDeployment(detailsRes.data);
      setScaleReplicas(detailsRes.data.replicas);
      setLogs(logsRes.data.logs || []);
      setEnvVars(envRes.data.env_vars || {});
      setError(null);
    } catch (err: any) {
        console.log(err);
    } finally {
      setLoading(false);
    }
  }, [deploymentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to WebSocket notifications for this specific deployment
  useEffect(() => {
    const handleNotification = (message: WebSocketMessage) => {
      console.log("Received WebSocket message:", message);

      // Parse the notification data
      let isForCurrentDeployment = false;
      let notificationData: any = null;

      try {
        // Backend sends nested data structure: message.data.data contains actual notification data
        const messageType = message.type;
        notificationData = message.data.data; // Access nested data

        console.log("Message type:", messageType);
        console.log("Message data:", notificationData);

        // Check if this notification is for the current deployment
        isForCurrentDeployment =
          (messageType === 'deployment_status_changed' && notificationData.deployment_id === deploymentId) ||
          (messageType === 'deployment_scaled' && notificationData.deployment_id === deploymentId) ||
          (messageType === 'deployment_created' && notificationData.deployment_id === deploymentId) ||
          (messageType === 'deployment_deleted' && notificationData.deployment_id === deploymentId) ||
          (messageType === 'deployment_updated' && notificationData.deployment_id === deploymentId) ||
          (messageType === 'deployment_restarted' && notificationData.deployment_id === deploymentId);

        console.log("Is for current deployment:", isForCurrentDeployment);
        console.log("Current deployment ID:", deploymentId);
        console.log("Notification deployment ID:", notificationData.deployment_id);

        if (isForCurrentDeployment) {
          console.log("Notification is for current deployment, refreshing data...");
          fetchData();

          // Show toast notification
          if (messageType === 'deployment_status_changed') {
            showToast(`Deployment status changed to: ${notificationData.status}`, 'success');
          } else if (messageType === 'deployment_scaled') {
            showToast(`Deployment scaled from ${notificationData.old_replicas} to ${notificationData.new_replicas} replicas`, 'success');
          } else if (messageType === 'deployment_created') {
            showToast(`Deployment ${notificationData.app_name} created successfully`, 'success');
          } else if (messageType === 'deployment_deleted') {
            showToast(`Deployment ${notificationData.app_name} deleted`, 'error');
            // Redirect to deployments page after deletion
            setTimeout(() => navigate('/deployments'), 2000);
          } else if (messageType === 'deployment_updated') {
            showToast(`Deployment updated: ${notificationData.changes}`, 'success');
          } else if (messageType === 'deployment_restarted') {
            showToast(`Deployment ${notificationData.app_name} restarted successfully`, 'success');
          }
        }
      } catch (error) {
        console.error("Error parsing notification:", error);
      }
    };

    const unsubscribe = addNotificationHandler(handleNotification);

    return () => {
      unsubscribe();
    };
  }, [deploymentId, addNotificationHandler, fetchData, navigate]);

  const handleScale = async () => {
    try {
      setIsScaling(true);
      await api.patch(`/v1/deployments/${deploymentId}/scale`, { replicas: scaleReplicas });
      showToast('Scaling request sent successfully!', 'success');
      // Refresh deployment data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      const analysis = analyzeContainerError(err);
      if (analysis.isContainerError) {
        showToast('Deployment is starting up. Scaling will be applied once the container is ready.', 'error');
      } else {
        showToast(err.response?.data?.error?.message || 'Failed to scale deployment.', 'error');
      }
    } finally {
      setIsScaling(false);
    }
  };

  const handleDeleteDeployment = async () => {
    if (!window.confirm('Are you sure you want to delete this deployment? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/v1/deployments/${deploymentId}`);
      showToast('Deployment deleted successfully!', 'success');
      // Redirect to deployments page after deletion
      setTimeout(() => {
        navigate('/deployments');
      }, 1500);
    } catch (err: any) {
      const analysis = analyzeContainerError(err);
      if (analysis.isContainerError) {
        showToast('Cannot delete deployment while it is starting up. Please wait for the deployment to be ready.', 'error');
      } else {
        showToast(err.response?.data?.error?.message || 'Failed to delete deployment.', 'error');
      }
    }
  };

  const handleRestartDeployment = async () => {
    if (!window.confirm('Are you sure you want to restart this deployment?')) {
      return;
    }
    try {
      setIsRestarting(true);
      await api.post(`/v1/deployments/${deploymentId}/restart`);
      showToast('Deployment restart initiated successfully!', 'success');
      // Refresh deployment data after a short delay
      setTimeout(() => {
        fetchData();
      }, 2000);
    } catch (err: any) {
      const analysis = analyzeContainerError(err);
      if (analysis.isContainerError) {
        showToast('Deployment is starting up. Restart operation will be queued.', 'error');
      } else {
        showToast(err.response?.data?.error?.message || 'Failed to restart deployment.', 'error');
      }
    } finally {
      setIsRestarting(false);
    }
  };

  // Environment Variables functions
  const handleAddEnvVar = async () => {
    if (!newEnvKey.trim() || !newEnvValue.trim()) {
      showToast('Both key and value are required', 'error');
      return;
    }

    if (envVars.hasOwnProperty(newEnvKey)) {
      showToast('Environment variable key already exists', 'error');
      return;
    }

    try {
      setIsUpdatingEnv(true);
      const updatedEnvVars = { ...envVars, [newEnvKey]: newEnvValue };
      await api.patch(`/v1/deployments/${deploymentId}/env`, {
        env_vars: { [newEnvKey]: newEnvValue }
      });
      
      setEnvVars(updatedEnvVars);
      setNewEnvKey('');
      setNewEnvValue('');
      setShowAddEnvForm(false);
      showToast('Environment variable added successfully!', 'success');
    } catch (err: any) {
      const analysis = analyzeContainerError(err);
      if (analysis.isContainerError) {
        showToast('Deployment is starting up. Environment variables will be updated once the container is ready.', 'error');
      } else {
        showToast(err.response?.data?.error?.message || 'Failed to add environment variable', 'error');
      }
    } finally {
      setIsUpdatingEnv(false);
    }
  };

  const handleUpdateEnvVar = async (key: string, value: string) => {
    if (!value.trim()) {
      showToast('Environment variable value cannot be empty', 'error');
      return;
    }

    try {
      setIsUpdatingEnv(true);
      await api.patch(`/v1/deployments/${deploymentId}/env`, {
        env_vars: { [key]: value }
      });
      
      setEnvVars(prev => ({ ...prev, [key]: value }));
      setEditingEnvKey(null);
      setEditingEnvValue('');
      showToast('Environment variable updated successfully!', 'success');
    } catch (err: any) {
      const analysis = analyzeContainerError(err);
      if (analysis.isContainerError) {
        showToast('Deployment is starting up. Environment variable will be updated once the container is ready.', 'error');
      } else {
        showToast(err.response?.data?.error?.message || 'Failed to update environment variable', 'error');
      }
    } finally {
      setIsUpdatingEnv(false);
    }
  };

  const handleDeleteEnvVar = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete the environment variable "${key}"?`)) {
      return;
    }

    try {
      setIsUpdatingEnv(true);
      const updatedEnvVars = { ...envVars };
      delete updatedEnvVars[key];
      
      // Send all remaining env vars to backend (effectively removing the deleted one)
      await api.patch(`/v1/deployments/${deploymentId}/env`, {
        env_vars: updatedEnvVars
      });
      
      setEnvVars(updatedEnvVars);
      showToast('Environment variable deleted successfully!', 'success');
    } catch (err: any) {
      const analysis = analyzeContainerError(err);
      if (analysis.isContainerError) {
        showToast('Deployment is starting up. Environment variable will be deleted once the container is ready.', 'error');
      } else {
        showToast(err.response?.data?.error?.message || 'Failed to delete environment variable', 'error');
      }
    } finally {
      setIsUpdatingEnv(false);
    }
  };

  const startEditingEnvVar = (key: string, value: string) => {
    setEditingEnvKey(key);
    setEditingEnvValue(value);
  };

  const cancelEditingEnvVar = () => {
    setEditingEnvKey(null);
    setEditingEnvValue('');
  };

  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case 'running': return 'text-green-700 bg-green-100 border-green-200';
      case 'pending': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'failed': return 'text-red-700 bg-red-100 border-red-200';
      case 'stopped': return 'text-gray-700 bg-gray-100 border-gray-200';
      case 'updating': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'scaling': return 'text-purple-700 bg-purple-100 border-purple-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: DeploymentStatus) => {
    switch (status) {
      case 'running': return <CheckCircleIcon className="h-5 w-5" />;
      case 'pending': return <ClockIcon className="h-5 w-5" />;
      case 'failed': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'stopped': return <StopIcon className="h-5 w-5" />;
      case 'updating': return <ArrowPathIcon className="h-5 w-5 animate-spin" />;
      case 'scaling': return <ChartBarIcon className="h-5 w-5" />;
      default: return <ClockIcon className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not deployed';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading deployment details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Error Loading Deployment</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/deployments')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              Back to Deployments
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!deployment) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="text-center">
            <CubeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Deployment Not Found</h2>
            <p className="text-gray-600 mb-4">The deployment you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/deployments')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              Back to Deployments
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const TabButton: React.FC<{ tabName: typeof activeTab; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center justify-center sm:justify-start px-4 py-3 text-sm font-medium rounded-xl transition-all w-full sm:w-auto ${activeTab === tabName
        ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-lg'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
    >
      {icon}
      <span className="ml-2 hidden sm:inline">{label}</span>
    </button>
  );

  const DomainsTab: React.FC<{ deploymentId: string | undefined; showToast: (message: string, type?: 'success' | 'error') => void }> = ({ deploymentId, showToast }) => {
    const [domains, setDomains] = useState<DomainItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingDomain, setAddingDomain] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    const fetchDomains = useCallback(async () => {
      if (!deploymentId) return;
      try {
        setLoading(true);
        const response = await api.get(`/v1/deployments/${deploymentId}/domains`);
        setDomains(response.data.domains || []);
      } catch (err: any) {
        console.error('Failed to fetch domains:', err);
        setDomains([]);
      } finally {
        setLoading(false);
      }
    }, [deploymentId]);

    useEffect(() => {
      fetchDomains();

      // Poll for domain status updates every 10 seconds
      const pollInterval = setInterval(() => {
        fetchDomains();
      }, 10000);

      return () => clearInterval(pollInterval);
    }, [fetchDomains]);

    const handleAddDomain = async () => {
      if (!newDomain.trim() || !deploymentId) return;

      try {
        setAddingDomain(true);
        await api.post(`/v1/deployments/${deploymentId}/domains`, {
          domain: newDomain.trim()
        });
        showToast('Domain added successfully! SSL certificate provisioning will begin shortly.', 'success');
        setNewDomain('');
        setShowAddForm(false);
        fetchDomains();
      } catch (err: any) {
        showToast(err.response?.data?.error?.message || 'Failed to add domain', 'error');
      } finally {
        setAddingDomain(false);
      }
    };

    const handleRemoveDomain = async (domainId: string, domainName: string) => {
      if (!window.confirm(`Are you sure you want to remove domain "${domainName}"?`)) {
        return;
      }

      try {
        await api.delete(`/v1/deployments/${deploymentId}/domains/${domainId}`);
        showToast('Domain removed successfully', 'success');
        fetchDomains();
      } catch (err: any) {
        showToast(err.response?.data?.error?.message || 'Failed to remove domain', 'error');
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'verified': return 'text-green-700 bg-green-100 border-green-200';
        case 'pending': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
        case 'validating': return 'text-blue-700 bg-blue-100 border-blue-200';
        case 'failed': return 'text-red-700 bg-red-100 border-red-200';
        default: return 'text-gray-700 bg-gray-100 border-gray-200';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'verified': return <CheckCircleIcon className="h-4 w-4" />;
        case 'pending': return <ClockIcon className="h-4 w-4" />;
        case 'validating': return <ArrowPathIcon className="h-4 w-4 animate-spin" />;
        case 'failed': return <ExclamationTriangleIcon className="h-4 w-4" />;
        default: return <ClockIcon className="h-4 w-4" />;
      }
    };

    return (
      <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
              <GlobeAltIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Custom Domains</h2>
              <p className="text-gray-600 text-sm sm:text-base">Manage domains with automated SSL</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium w-full sm:w-auto justify-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Domain
          </button>
        </div>

        {/* Add Domain Form */}
        {showAddForm && (
          <div className="mb-6 p-4 sm:p-6 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Domain</h3>
            <div className="flex flex-col sm:flex-row items-center sm:space-x-4">
              <input
                type="text"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="flex-1 w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 sm:mb-0"
                onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
              />
              <div className="flex items-center justify-end w-full sm:w-auto space-x-2">
                <button
                  onClick={handleAddDomain}
                  disabled={addingDomain || !newDomain.trim()}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 transition-all font-medium flex-1 sm:flex-none"
                >
                  {addingDomain ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin inline" />
                      Adding...
                    </>
                  ) : (
                    'Add'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewDomain('');
                  }}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Make sure your domain points to your deployment URL before adding it.
            </p>
          </div>
        )}

        {/* Domains List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading domains...</p>
          </div>
        ) : domains.length > 0 ? (
          <div className="space-y-4">
            {domains.map((domain) => (
              <div key={domain.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-all">
                <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <GlobeAltIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 break-all">{domain.domain}</h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <span className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(domain.status)}`}>
                        {getStatusIcon(domain.status)}
                        <span className="ml-1 capitalize">{domain.status}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        Added {formatDate(domain.created_at)}
                      </span>
                      {domain.verified_at && (
                        <span className="text-xs text-green-600">
                          Verified {formatDate(domain.verified_at)}
                        </span>
                      )}
                      {domain.ssl_status && (
                        <span className={`text-xs ${domain.ssl_status === 'issued' ? 'text-green-600' : 'text-gray-500'}`}>
                          SSL: {domain.ssl_status}
                        </span>
                      )}
                      {domain.ssl_expires_at && (
                        <span className="text-xs text-gray-500">
                          Expires {formatDate(domain.ssl_expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 self-end sm:self-center">
                  {domain.status === 'verified' && (
                    <button
                      onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveDomain(domain.id, domain.domain)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <GlobeAltIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Custom Domains</h3>
            <p className="text-gray-600 mb-6">Add custom domains to access your deployment with your own domain name.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Your First Domain
            </button>
          </div>
        )}

        {/* Information Panel */}
        <div className="mt-8 space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Step-by-Step DNS Setup</h4>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li><strong>Get IP Address:</strong> Run <code className="bg-gray-200 px-1 rounded break-all">nslookup demo-deployment-dc7c4d37.vinhomes.co.uk</code></li>
              <li><strong>Login to Domain Provider:</strong> GoDaddy, Namecheap, Cloudflare, etc.</li>
              <li><strong>Find DNS Management:</strong> Look for "DNS", "DNS Records", or "Advanced DNS"</li>
              <li><strong>Add A Record:</strong> Point root domain (@) to the IP address</li>
              <li><strong>Add CNAME Record:</strong> Point www to your root domain</li>
              <li><strong>Save Changes:</strong> DNS propagation takes 5-30 minutes</li>
            </ol>
            <div className="mt-3 p-2 bg-blue-100 rounded">
              <p className="text-xs text-blue-800">
                🔒 SSL certificates are automatically provisioned using Let's Encrypt after DNS verification
              </p>
            </div>
          </div>

          {deployment && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">DNS Configuration Required</h4>
              <p className="text-sm text-blue-700 mb-2">
                Add these DNS records to your domain provider (GoDaddy, Namecheap, Cloudflare, etc.):
              </p>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm font-semibold text-gray-700 mb-1">A Record (Root Domain):</div>
                  <div className="text-sm font-mono space-y-1 break-words">
                    <div>Type: <span className="text-blue-600">A</span></div>
                    <div>Name: <span className="text-blue-600">@</span> (or leave blank)</div>
                    <div>Value: <span className="text-green-600">Get IP from: {deployment.url.replace('https://', '').replace('http://', '')}</span></div>
                    <div>TTL: <span className="text-blue-600">300</span></div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm font-semibold text-gray-700 mb-1">CNAME Record (WWW Subdomain):</div>
                  <div className="text-sm font-mono space-y-1 break-words">
                    <div>Type: <span className="text-blue-600">CNAME</span></div>
                    <div>Name: <span className="text-blue-600">www</span></div>
                    <div>Value: <span className="text-green-600">your-domain.com</span> (without www)</div>
                    <div>TTL: <span className="text-blue-600">300</span></div>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-yellow-100 rounded border border-yellow-300">
                <p className="text-xs text-yellow-800 break-words">
                  💡 <strong>Tip:</strong> Use <code>nslookup {deployment.url.replace('https://', '').replace('http://', '')}</code> to get the IP address
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
        <div className="p-4 md:p-8">
          {/* Toast Notification */}
          {toast.show && (
            <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-xl shadow-lg border transition-all transform ${toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              {toast.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 mr-3" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 mr-3" />
              )}
              {toast.message}
            </div>
          )}

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <button
                  onClick={() => navigate('/deployments')}
                  className="flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-200 text-gray-600 hover:text-blue-600 flex-shrink-0"
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 truncate">{deployment.app_name}</h1>
                    <span className={`flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(deployment.status)}`}>
                      {getStatusIcon(deployment.status)}
                      <span className="ml-2 capitalize">{deployment.status}</span>
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <LinkIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <a
                      href={deployment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium break-all"
                    >
                      {deployment.url}
                    </a>
                    <button
                      onClick={() => copyToClipboard(deployment.url, 'URL')}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded transition-all"
                    >
                      <ClipboardDocumentListIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <a 
                  href={deployment.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex flex-1 md:flex-none items-center justify-center px-4 py-2 text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-xl transition-all shadow-md"
                >
                  <EyeIcon className="h-5 w-5 mr-2" />
                  View Live
                </a>

                <button
                  onClick={handleDeleteDeployment}
                  className="flex flex-1 md:flex-none items-center justify-center px-4 py-2 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-xl transition-all shadow-md"
                >
                  <TrashIcon className="h-5 w-5 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <ServerIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{deployment.replicas}</h3>
                  <p className="text-gray-600">Replicas</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <CloudIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{deployment.port}</h3>
                  <p className="text-gray-600">Port</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <CpuChipIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{deployment.resources.cpu || 'Auto'}</h3>
                  <p className="text-gray-600">CPU</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <CircleStackIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{deployment.resources.memory || 'Auto'}</h3>
                  <p className="text-gray-600">Memory</p>
                </div>
              </div>
            </div>
          </div>

          {/* Container Status Warning */}
          {(deployment.status === 'pending' || deployment.status === 'updating') && (
            <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 sm:p-6 shadow-lg">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-yellow-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-yellow-900">Container Starting Up</h3>
                  <p className="text-yellow-700 text-sm">
                    Your deployment is currently initializing. Some operations may not be available until the container is fully ready. This typically takes 30-90 seconds.
                  </p>
                </div>
              </div>
              <div className="mt-4 bg-yellow-100 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  💡 <strong>Tip:</strong> You can still configure settings, but changes will be applied once the container is ready.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex flex-wrap space-x-2 sm:space-x-4 mb-8 bg-white rounded-2xl p-2 sm:p-4 shadow-lg border border-gray-100">
            <TabButton
              tabName="overview"
              label="Overview"
              icon={<ChartBarIcon className="h-5 w-5" />}
            />
            <TabButton
              tabName="logs"
              label="Logs"
              icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
            />
            <TabButton
              tabName="domains"
              label="Domains"
              icon={<GlobeAltIcon className="h-5 w-5" />}
            />
            <TabButton
              tabName="settings"
              label="Settings"
              icon={<Cog6ToothIcon className="h-5 w-5" />}
            />
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Deployment Information */}
                <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                      <CubeIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Deployment Information</h2>
                      <p className="text-gray-600">Core deployment details</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 border-b border-gray-100">
                      <span className="font-medium text-gray-700 mb-1 sm:mb-0">Deployment ID:</span>
                      <div className="flex items-center">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-800 mr-2 break-all">
                          {deployment.id}
                        </code>
                        <button
                          onClick={() => copyToClipboard(deployment.id, 'Deployment ID')}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-all"
                        >
                          <ClipboardDocumentListIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 border-b border-gray-100">
                      <span className="font-medium text-gray-700 mb-1 sm:mb-0">Container Image:</span>
                      <div className="flex items-center">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-800 mr-2 break-all">
                          {deployment.image}
                        </code>
                        <button
                          onClick={() => copyToClipboard(deployment.image, 'Container Image')}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-all"
                        >
                          <ClipboardDocumentListIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="font-medium text-gray-700">Created:</span>
                      <span className="text-gray-900 text-sm text-right">{formatDate(deployment.created_at)}</span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="font-medium text-gray-700">Last Updated:</span>
                      <span className="text-gray-900 text-sm text-right">{formatDate(deployment.updated_at)}</span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="font-medium text-gray-700">Deployed At:</span>
                      <span className="text-gray-900 text-sm text-right">{formatDate(deployment.deployed_at)}</span>
                    </div>

                    <div className="flex justify-between items-center py-3">
                      <span className="font-medium text-gray-700">User ID:</span>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-800 break-all">
                        {deployment.user_id}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Scaling Controls */}
                <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                      <ChartBarIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Scaling Control</h2>
                      <p className="text-gray-600">Adjust running instances</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label htmlFor="replicas" className="block text-sm font-medium text-gray-700 mb-3">
                        Number of Replicas
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <input
                          type="number"
                          id="replicas"
                          min="0"
                          max="10"
                          value={scaleReplicas}
                          onChange={(e) => setScaleReplicas(Number(e.target.value))}
                          className="w-full sm:w-24 px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-mono text-lg"
                        />
                        <button
                          onClick={handleScale}
                          disabled={isScaling || scaleReplicas === deployment.replicas}
                          className="flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-linear-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 transition-all font-medium shadow-lg hover:shadow-xl"
                        >
                          {isScaling ? (
                            <>
                              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                              Scaling...
                            </>
                          ) : (
                            <>
                              <RocketLaunchIcon className="h-5 w-5 mr-2" />
                              Apply Scale
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Current: {deployment.replicas} replica{deployment.replicas !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Resource Information */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Resource Allocation</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <div className="flex items-center mb-2">
                            <CpuChipIcon className="h-5 w-5 text-blue-600 mr-2" />
                            <span className="font-medium text-gray-700">CPU</span>
                          </div>
                          <span className="text-lg font-mono text-gray-900">
                            {deployment.resources.cpu || 'Auto-scaled'}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <div className="flex items-center mb-2">
                            <CircleStackIcon className="h-5 w-5 text-purple-600 mr-2" />
                            <span className="font-medium text-gray-700">Memory</span>
                          </div>
                          <span className="text-lg font-mono text-gray-900">
                            {deployment.resources.memory || 'Auto-scaled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <LogsPage />
            )}

            {activeTab === 'domains' && (
              domainComingSoon ? (
                <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
                  <div className="text-center py-12 sm:py-16">
                    <div className="relative inline-block">
                      <GlobeAltIcon className="h-20 w-20 sm:h-24 sm:w-24 text-gray-300 mx-auto mb-6" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <ClockIcon className="h-5 w-5 text-yellow-600" />
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Custom Domains Coming Soon!</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      We're working hard to bring you custom domain management with automated DNS validation and Let's Encrypt SSL certificates.
                    </p>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 max-w-lg mx-auto">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">✨ What's Coming</h4>
                      <ul className="text-sm text-gray-700 space-y-2 text-left">
                        <li className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          <span>One-click domain setup</span>
                        </li>
                        <li className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          <span>Automatic DNS validation</span>
                        </li>
                        <li className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          <span>Free SSL certificates via Let's Encrypt</span>
                        </li>
                        <li className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          <span>Real-time certificate renewal</span>
                        </li>
                        <li className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          <span>Multi-domain support</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200 max-w-lg mx-auto">
                      <p className="text-sm text-blue-700">
                        <span className="font-semibold">🚀 Stay tuned!</span> This feature is currently in development.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <DomainsTab deploymentId={deploymentId} showToast={showToast} />
              )
            )}

            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* Quick Actions */}
                <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                      <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                      <p className="text-gray-600">Common deployment operations</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={handleRestartDeployment}
                      disabled={isRestarting || deployment.status !== 'running'}
                      className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 transition-all font-medium shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                    >
                      {isRestarting ? (
                        <>
                          <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                          Restarting...
                        </>
                      ) : (
                        <>
                          <ArrowPathIcon className="h-5 w-5 mr-2" />
                          Restart Deployment
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => window.open(deployment.url, '_blank')}
                      disabled={!deployment.url || deployment.status !== 'running'}
                      className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 transition-all font-medium shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                    >
                      <GlobeAltIcon className="h-5 w-5 mr-2" />
                      View Live App
                    </button>
                  </div>
                </div>

                {/* Environment Variables */}
                <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                    <div className="flex items-center mb-4 sm:mb-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                        <Cog6ToothIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Environment Variables</h2>
                        <p className="text-gray-600">Application configuration</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddEnvForm(true)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium w-full sm:w-auto justify-center"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add Variable
                    </button>
                  </div>

                  {/* Add Environment Variable Form */}
                  {showAddEnvForm && (
                    <div className="mb-6 p-4 sm:p-6 bg-blue-50 border border-blue-200 rounded-xl">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Environment Variable</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Key <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="VARIABLE_NAME"
                            value={newEnvKey}
                            onChange={(e) => setNewEnvKey(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                          />
                          <p className="text-xs text-gray-500 mt-1">Use uppercase with underscores (e.g., API_KEY)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Value <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            placeholder="variable_value"
                            value={newEnvValue}
                            onChange={(e) => setNewEnvValue(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono min-h-[3rem] max-h-32 resize-y"
                            rows={1}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {newEnvValue.length > 0 && `${newEnvValue.length} characters`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={handleAddEnvVar}
                          disabled={isUpdatingEnv || !newEnvKey.trim() || !newEnvValue.trim()}
                          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 transition-all font-medium"
                        >
                          {isUpdatingEnv ? (
                            <>
                              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin inline" />
                              Adding...
                            </>
                          ) : (
                            'Add Variable'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddEnvForm(false);
                            setNewEnvKey('');
                            setNewEnvValue('');
                          }}
                          className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {Object.keys(envVars).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(envVars).map(([key, value]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                          {editingEnvKey === key ? (
                            // Edit mode
                            <div className="flex-1 w-full">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4">
                                <div className="sm:w-1/3 mb-2 sm:mb-0">
                                  <code className="font-mono text-sm bg-blue-50 px-3 py-2 rounded-lg border text-blue-700 font-semibold break-all w-full block">
                                    {key}
                                  </code>
                                </div>
                                <span className="text-gray-400 font-bold hidden sm:inline self-start mt-2">=</span>
                                <div className="sm:w-2/3 relative">
                                  <textarea
                                    value={editingEnvValue}
                                    onChange={(e) => setEditingEnvValue(e.target.value)}
                                    className="w-full font-mono text-sm bg-white px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[2.5rem] max-h-32 resize-y"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.ctrlKey) {
                                        handleUpdateEnvVar(key, editingEnvValue);
                                      } else if (e.key === 'Escape') {
                                        cancelEditingEnvVar();
                                      }
                                    }}
                                    placeholder="Enter environment variable value..."
                                    autoFocus
                                  />
                                  <div className="absolute -bottom-5 right-0 text-xs text-gray-500">
                                    Ctrl+Enter to save, Esc to cancel
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 mt-2 sm:mt-0 self-end">
                                <button
                                  onClick={() => handleUpdateEnvVar(key, editingEnvValue)}
                                  disabled={isUpdatingEnv}
                                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelEditingEnvVar}
                                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4">
                                  <div className="sm:w-1/3 mb-2 sm:mb-0">
                                    <code className="font-mono text-sm bg-blue-50 px-3 py-2 rounded-lg border text-blue-700 font-semibold break-all w-full block">
                                      {key}
                                    </code>
                                  </div>
                                  <span className="text-gray-400 font-bold hidden sm:inline self-start mt-2">=</span>
                                  <div className="sm:w-2/3 relative group">
                                    <div className="relative">
                                      <code 
                                        className="font-mono text-sm bg-white px-3 py-2 rounded-lg border text-gray-800 w-full block break-all max-h-20 overflow-y-auto cursor-default"
                                        title={value.length > 50 ? value : ''}
                                      >
                                        {value}
                                      </code>
                                      {value.length > 100 && (
                                        <div className="absolute top-1 right-1 bg-gray-100 text-xs text-gray-600 px-2 py-1 rounded opacity-75">
                                          {value.length} chars
                                        </div>
                                      )}
                                      {value.length > 200 && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none rounded-lg"></div>
                                      )}
                                    </div>
                                    {/* Expandable tooltip for very long values */}
                                    {value.length > 50 && (
                                      <div className="absolute left-0 top-full mt-1 invisible group-hover:visible bg-gray-900 text-white p-3 rounded-lg shadow-lg z-50 max-w-md break-all text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <div className="max-h-32 overflow-y-auto">
                                          {value}
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                                          Full value ({value.length} characters)
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-0 sm:ml-4 mt-2 sm:mt-0 self-end sm:self-center">
                                <button
                                  onClick={() => copyToClipboard(`${key}=${value}`, 'Environment variable')}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all"
                                >
                                  <ClipboardDocumentListIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => startEditingEnvVar(key, value)}
                                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Cog6ToothIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEnvVar(key)}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Cog6ToothIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Environment Variables</h3>
                      <p className="text-gray-600 mb-6">This deployment has no environment variables configured.</p>
                      <button 
                        onClick={() => setShowAddEnvForm(true)}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium"
                      >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Environment Variable
                      </button>
                    </div>
                  )}

                  {/* Information Panel */}
                  <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-800 mb-1">Important Notes</h4>
                        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                          <li>Changes to environment variables will trigger a deployment restart</li>
                          <li>Environment variables are case-sensitive</li>
                          <li>Avoid storing sensitive data like passwords in plain text</li>
                          <li>Changes may take a few minutes to apply</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Health Check Settings */}
                <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Health Check</h2>
                      <p className="text-gray-600">Monitor your application's health</p>
                    </div>
                  </div>

                  {deployment.health_check ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <span className="font-medium text-gray-700">Endpoint:</span>
                          <code className="block text-sm bg-white px-2 py-1 rounded mt-1 text-gray-800 break-all">
                            {deployment.health_check.endpoint || '/health'}
                          </code>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <span className="font-medium text-gray-700">Interval:</span>
                          <code className="block text-sm bg-white px-2 py-1 rounded mt-1 text-gray-800">
                            {deployment.health_check.interval || '30s'}
                          </code>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ExclamationTriangleIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Health Check Configured</h3>
                      <p className="text-gray-600 mb-6">Configure health checks to monitor availability.</p>
                      <button className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium">
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Configure Health Check
                      </button>
                    </div>
                  )}
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-red-200">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-red-900">Danger Zone</h2>
                      <p className="text-red-600">Irreversible and destructive actions</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-red-200 rounded-xl">
                      <div className="mb-3 sm:mb-0">
                        <h3 className="font-semibold text-gray-900">Stop Deployment</h3>
                        <p className="text-gray-600 text-sm">Stop all running instances of this deployment.</p>
                      </div>
                      <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all font-medium self-end sm:self-center">
                        <StopIcon className="h-4 w-4 mr-2 inline" />
                        Stop
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-red-200 rounded-xl">
                      <div className="mb-3 sm:mb-0">
                        <h3 className="font-semibold text-gray-900">Delete Deployment</h3>
                        <p className="text-gray-600 text-sm">Permanently delete this deployment and all data.</p>
                      </div>
                      <button
                        onClick={handleDeleteDeployment}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium self-end sm:self-center"
                      >
                        <TrashIcon className="h-4 w-4 mr-2 inline" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DeploymentDetailPage;