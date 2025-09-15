// src/pages/DeploymentsPage.tsx
import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { Link } from 'react-router-dom';

interface Deployment {
  id: string;
  appName: string;
  image: string;
  status: 'pending' | 'running' | 'stopped' | 'failed' | 'updating' | 'scaling'| 'starting' | 'stopping';
  url: string;
  replicas: number;
  createdAt: string;
  updatedAt: string;
}

const DeploymentsPage: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const deploymentsPerPage = 10; // Cấu hình số lượng deployments hiển thị mỗi trang

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        setLoading(true);
        const response = await api.get('/v1/deployments', {
          params: {
            page: currentPage,
            limit: deploymentsPerPage,
          },
        });
        setDeployments(response.data.deployments);
        setTotalPages(response.data.pagination.totalPages);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to fetch deployments.');
      } finally {
        setLoading(false);
      }
    };

    fetchDeployments();
  }, [currentPage]);

  const handleDeleteDeployment = async (deploymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this deployment?')) {
      return;
    }
    try {
      await api.delete(`/v1/deployments/${deploymentId}`);
      setDeployments(deployments.filter(d => d.id !== deploymentId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete deployment.');
    }
  };

  const handleStopDeployment = async (deploymentId: string) => {
    try {
      await api.post(`/v1/deployments/${deploymentId}/stop`);
      setDeployments(deployments.map(d => d.id === deploymentId ? { ...d, status: 'stopping' } : d));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to stop deployment.');
    }
  };

  const handleStartDeployment = async (deploymentId: string) => {
    try {
      await api.post(`/v1/deployments/${deploymentId}/start`);
      setDeployments(deployments.map(d => d.id === deploymentId ? { ...d, status: 'starting' } : d));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to start deployment.');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Your Deployments</h1>
          <Link
            to="/deployments/new"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition duration-200"
          >
            + New Deployment
          </Link>
        </div>

        {loading && <div className="text-center text-gray-600">Loading deployments...</div>}
        {error && <div className="text-red-500 text-center">{error}</div>}

        {!loading && deployments.length === 0 && !error && (
          <div className="text-center text-gray-600">No deployments found. Start by creating a new one!</div>
        )}

        {deployments.length > 0 && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    App Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Replicas
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deployments.map((deployment) => (
                  <tr key={deployment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link to={`/deployments/${deployment.id}`} className="text-primary hover:underline">
                        {deployment.appName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{deployment.image}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          deployment.status === 'running'
                            ? 'bg-green-100 text-green-800'
                            : deployment.status === 'pending' || deployment.status === 'updating' || deployment.status === 'scaling' || deployment.status === 'starting' || deployment.status === 'stopping'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {deployment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a href={deployment.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {deployment.url}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{deployment.replicas}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {deployment.status === 'running' && (
                          <button
                            onClick={() => handleStopDeployment(deployment.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Stop
                          </button>
                        )}
                        {(deployment.status === 'stopped' || deployment.status === 'failed') && (
                          <button
                            onClick={() => handleStartDeployment(deployment.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Start
                          </button>
                        )}
                        <Link to={`/deployments/${deployment.id}`} className="text-indigo-600 hover:text-indigo-900">
                          View
                        </Link>
                        <button
                          onClick={() => handleDeleteDeployment(deployment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                    currentPage === page ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DeploymentsPage;