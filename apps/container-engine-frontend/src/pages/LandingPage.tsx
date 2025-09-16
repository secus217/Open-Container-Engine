// src/pages/LandingPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, CloudArrowUpIcon, FingerPrintIcon, CheckIcon, PlayIcon } from '@heroicons/react/24/outline';

const features = [
    {
        name: 'User Management System',
        description: 'Complete user registration and login system with secure password management. Generate, manage, and revoke API keys for secure access. Comprehensive user interface for managing deployments.',
        icon: FingerPrintIcon,
    },
    {
        name: 'Deploy via API',
        description: 'Go from container image to live URL with a single API call, reducing deployment time from hours to seconds. No need to write YAML or manage `kubectl`.',
        icon: CloudArrowUpIcon,
    },
    {
        name: 'Zero Downtime Updates',
        description: 'Update your applications seamlessly with rolling updates that guarantee availability. Built on the robust foundation of Kubernetes for reliability and scale.',
        icon: ArrowPathIcon,
    },
];

const stats = [
    { name: 'Deployments', value: '10,000+' },
    { name: 'Developers', value: '2,500+' },
    { name: 'Uptime', value: '99.9%' },
    { name: 'Countries', value: '50+' },
];


const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-inter">
            {/* Header / Navbar */}
            <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
                <nav className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">CE</span>
                            </div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Container Engine
                            </span>
                        </div>
                        <div className="flex items-center space-x-6">
                            <a href="https://decenter.ai/" target="_blank" rel="noopener noreferrer" 
                               className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 font-medium transition-colors group">
                                <div className="w-5 h-5 bg-black rounded-sm flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                                    <span className="text-white text-xs font-bold">D</span>
                                </div>
                                <span>Decenter.AI</span>
                            </a>
                            <a href="#features" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                                Features
                            </a>
                            <a href="#pricing" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                                Pricing
                            </a>
                            <Link to="/auth" 
                                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-20 pb-32">
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                <div className="container mx-auto px-6 text-center relative">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-8">
                        🚀 Now supporting Kubernetes 1.28+
                    </div>
                    <h1 className="text-6xl md:text-7xl font-extrabold mb-8 leading-tight">
                        Deploy Containers
                        <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            in Seconds
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                        The open-source alternative to Google Cloud Run. Built with Rust & Axum for 
                        enterprise-grade performance and reliability.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12">
                        <Link to="/auth" 
                              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                            Start Free Trial
                        </Link>
                        <button className="flex items-center px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-lg hover:border-blue-600 hover:text-blue-600 transition-all duration-200">
                            <PlayIcon className="w-5 h-5 mr-2" />
                            Watch Demo
                        </button>
                    </div>

                    {/* Trust Indicators */}
                    <div className="flex justify-center items-center space-x-8 mb-16">
                        <img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build Status" className="h-6" />
                        <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Code Coverage" className="h-6" />
                        <img src="https://github.com/AI-Decenter/Open-Container-Engine" alt="GitHub Stars" className="h-6" />
                    </div>

                    {/* Hero Image/Dashboard Preview */}
                    <div className="relative max-w-6xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
                            <div className="bg-gray-100 rounded-xl h-96 flex items-center justify-center">
                                <span className="text-gray-500 text-lg">Dashboard Preview</span>
                            </div>
                        </div>
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full opacity-20 blur-xl"></div>
                        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 blur-xl"></div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat) => (
                            <div key={stat.name} className="text-center">
                                <div className="text-4xl font-bold text-blue-600 mb-2">{stat.value}</div>
                                <div className="text-gray-600 font-medium">{stat.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl font-bold text-gray-900 mb-6">
                            Why Choose Container Engine?
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Built for developers who demand simplicity without sacrificing power
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        {features.map((feature, index) => (
                            <div key={feature.name} 
                                 className="group relative p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
                                <div className="absolute -top-4 left-8">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div className="pt-8">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.name}</h3>
                                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Code Example Section */}
            <section className="py-20 bg-gray-900 text-white">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-4xl font-bold mb-6">Deploy in One Command</h2>
                            <p className="text-xl text-gray-300 mb-8">
                                No complex YAML files. No kubectl knowledge required. Just one simple API call.
                            </p>
                            <div className="space-y-4">
                                {[
                                    'Push your container to any registry',
                                    'Make a single API call',
                                    'Get a live URL in seconds'
                                ].map((step, index) => (
                                    <div key={index} className="flex items-center">
                                        <CheckIcon className="w-5 h-5 text-green-400 mr-3" />
                                        <span>{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <div className="flex items-center mb-4">
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                </div>
                                <span className="ml-4 text-gray-400 text-sm">terminal</span>
                            </div>
                            <pre className="text-green-400 text-sm">
{`curl -X POST https://api.decenter.run/deploy \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image": "nginx:latest",
    "port": 80,
    "subdomain": "my-app"
  }'`}
                            </pre>
                        </div>
                    </div>
                </div>
            </section>

           

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-5xl font-bold mb-6">Ready to Deploy?</h2>
                    <p className="text-xl mb-12 opacity-90 max-w-3xl mx-auto">
                        Join thousands of developers who have already simplified their deployment process
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
                        <Link to="/auth" 
                              className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl text-lg hover:bg-gray-100 transition-colors shadow-xl">
                            Start Free Trial
                        </Link>
                        <a href="https://github.com/AI-Decenter/Open-Container-Engine" target="_blank" rel="noopener noreferrer"
                           className="px-8 py-4 border-2 border-white text-white font-bold rounded-xl text-lg hover:bg-white hover:text-blue-600 transition-colors">
                            View on GitHub
                        </a>
                    </div>
                    <p className="text-sm opacity-80">
                        Free tier includes 100 deployments/month • No credit card required
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 py-16">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold">CE</span>
                                </div>
                                <span className="text-xl font-bold text-white">Container Engine</span>
                            </div>
                            <p className="text-gray-400 mb-4">
                                The open-source alternative to Google Cloud Run
                            </p>
                            <div className="flex space-x-4">
                                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                    <span className="sr-only">Twitter</span>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                                    </svg>
                                </a>
                                <a href="https://github.com/AI-Decenter/Open-Container-Engine" className="text-gray-400 hover:text-white transition-colors">
                                    <span className="sr-only">GitHub</span>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-4">Product</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-4">Company</h3>
                            <ul className="space-y-2">
                                <li><a href="https://decenter.ai/" className="hover:text-white transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-4">Support</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            <p className="text-sm text-gray-400">
                                &copy; {new Date().getFullYear()} Container Engine by Decenter.AI. All rights reserved.
                            </p>
                            <div className="flex space-x-6 mt-4 md:mt-0">
                                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</a>
                                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Cookies</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;