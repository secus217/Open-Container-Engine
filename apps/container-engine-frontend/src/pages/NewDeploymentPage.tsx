// src/pages/NewDeploymentPage.tsx
import React, { useState } from 'react';
import api from '../lib/api';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';

const NewDeploymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [appName, setAppName] = useState('');
  const [image, setImage] = useState('');
  const [port, setPort] = useState(80);
  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  const [replicas, setReplicas] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvVars = [...envVars];
    newEnvVars[index] = { ...newEnvVars[index], [field]: value };
    setEnvVars(newEnvVars);
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    const newEnvVars = envVars.filter((_, i) => i !== index);
    setEnvVars(newEnvVars);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formattedEnvVars = envVars.reduce((acc: { [key: string]: string }, env) => {
      if (env.key && env.value) {
        acc[env.key] = env.value;
      }
      return acc;
    }, {});

    try {
      const response = await api.post('/v1/deployments', {
        appName,
        image,
        port,
        envVars: formattedEnvVars,
        replicas,
      });
      setSuccess(`Deployment '${response.data.appName}' created! URL: ${response.data.url}`);
      navigate(`/deployments/${response.data.id}`); // Chuyển hướng đến chi tiết deployment
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Deployment</h1>
        <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* App Name */}
            <div>
              <label htmlFor="appName" className="block text-sm font-medium text-gray-700">App Name</label>
              <input
                type="text"
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="my-awesome-app"
              />
              <p className="mt-2 text-xs text-gray-500">A unique name for your application.</p>
            </div>

            {/* Image */}
            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700">Container Image</label>
              <input
                type="text"
                id="image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="nginx:latest or your-registry/your-image:tag"
              />
            </div>

            {/* Port & Replicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="port" className="block text-sm font-medium text-gray-700">Port</label>
                <input
                  type="number"
                  id="port"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">The port your application listens on inside the container.</p>
              </div>
              <div>
                <label htmlFor="replicas" className="block text-sm font-medium text-gray-700">Replicas</label>
                <input
                  type="number"
                  id="replicas"
                  value={replicas}
                  onChange={(e) => setReplicas(Number(e.target.value))}
                  required
                  min="1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">Number of instances to run.</p>
              </div>
            </div>

            {/* Environment Variables */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Environment Variables</h3>
              <div className="space-y-4">
                {envVars.map((env, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="KEY"
                      value={env.key}
                      onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                    <input
                      type="text"
                      placeholder="VALUE"
                      value={env.value}
                      onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeEnvVar(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addEnvVar}
                className="mt-4 px-4 py-2 border border-dashed border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
              >
                + Add Variable
              </button>
            </div>
            
            {/* Thêm các tùy chọn nâng cao như resource limits, health checks ở đây nếu cần */}

            {/* Submit & Status */}
            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400"
                >
                  {loading ? 'Deploying...' : 'Deploy'}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm text-right mt-4">{error}</p>}
              {success && <p className="text-green-500 text-sm text-right mt-4">{success}</p>}
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewDeploymentPage;