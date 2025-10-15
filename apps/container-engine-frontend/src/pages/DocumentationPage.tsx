// src/pages/DocumentationPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpenIcon,
  RocketLaunchIcon,
  CodeBracketIcon,
  CogIcon,
  KeyIcon,
  ServerIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  ShieldCheckIcon,
  BoltIcon,
  GlobeAltIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const DocumentationPage: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('getting-started');

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['getting-started', 'authentication', 'api-reference', 'deployment-guide', 'webhooks', 'configuration'];
      const scrollPosition = window.scrollY + 150; // Increased offset for better accuracy

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: RocketLaunchIcon,
      description: 'Quick setup and your first deployment'
    },
    {
      id: 'authentication',
      title: 'Authentication',
      icon: KeyIcon,
      description: 'Understanding auth flows and API keys'
    },
    {
        id: 'deployment-guide',
        title: 'Deployment Guide',
        icon: ServerIcon,
        description: 'Core concepts of deploying containers'
    },
    {
        id: 'webhooks',
        title: 'Webhooks',
        icon: BellIcon,
        description: 'Receive real-time event notifications'
    },
    {
        id: 'configuration',
        title: 'Configuration',
        icon: CogIcon,
        description: 'Advanced service configuration options'
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      icon: CodeBracketIcon,
      description: 'Complete endpoint documentation'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Modern Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-200/60 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-18">
            <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <img src="/open-container-engine-logo.png" alt="Container Engine" className="relative rounded-lg w-8 h-8 sm:w-10 sm:h-10 object-cover shadow-md" />
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Container Engine
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              <Link to="/" className="px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50/80 rounded-lg font-medium transition-all duration-200 text-sm lg:text-base">
                Home
              </Link>
              <Link to="/features" className="px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50/80 rounded-lg font-medium transition-all duration-200 text-sm lg:text-base">
                Features
              </Link>
              <span className="px-3 py-2 text-blue-600 bg-blue-50 rounded-lg font-semibold text-sm lg:text-base border border-blue-200">
                Documentation
              </span>
              <Link to="/auth" className="ml-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold text-sm lg:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                Get Started
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <Link to="/auth" className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold text-sm shadow-md">
                Start
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-5 w-5" />
                ) : (
                  <Bars3Icon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200/60 bg-white/95 backdrop-blur-sm">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <Link to="/" className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
                  Home
                </Link>
                <Link to="/features" className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
                  Features
                </Link>
                <span className="block px-3 py-2 text-blue-600 bg-blue-50 rounded-lg font-semibold">
                  Documentation
                </span>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section - Mobile Optimized */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 border border-blue-200/50 shadow-lg">
                <BookOpenIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <span className="text-xs sm:text-sm font-semibold text-blue-600">Documentation</span>
              </div>
            </div>
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent leading-tight">
              Developer Documentation
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
              Complete guide to deploying and managing containers with Container Engine.
              <br className="hidden sm:block" />
              From quick start to advanced configurations.
            </p>
            <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
              <a href="#getting-started" className="group w-full xs:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center text-sm sm:text-base">
                <RocketLaunchIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 group-hover:scale-110 transition-transform" />
                Quick Start Guide
              </a>
              <a href="#api-reference" className="w-full xs:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-lg sm:rounded-xl hover:bg-white hover:shadow-lg transition-all duration-200 font-semibold border border-gray-200/50 flex items-center justify-center text-sm sm:text-base">
                <CodeBracketIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                API Reference
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 xl:gap-12">
          {/* Enhanced Sidebar Navigation - Mobile Optimized */}
          <div className="xl:col-span-1 order-2 xl:order-1">
            {/* Mobile: Horizontal scrolling navigation */}
            <div className="xl:hidden mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center px-2">
                <BookOpenIcon className="h-5 w-5 mr-3 text-blue-600" />
                Contents
              </h3>
              <div className="flex overflow-x-auto pb-4 space-x-3 px-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`flex-none flex items-center px-3 py-2 text-xs rounded-lg transition-all duration-200 whitespace-nowrap ${
                      activeSection === section.id 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 border border-gray-200'
                    }`}
                  >
                    <section.icon className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span className="font-medium">{section.title}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Desktop: Sticky sidebar */}
            <div className="hidden xl:block bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
              <div className="p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                  <BookOpenIcon className="h-5 w-5 mr-3 text-blue-600" />
                  Contents
                </h3>
                <nav className="space-y-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200 group ${
                      activeSection === section.id 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-l-4 border-blue-500 font-semibold shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                    }`}
                  >
                    <section.icon className={`h-4 w-4 mr-3 flex-shrink-0 transition-all duration-200 ${
                      activeSection === section.id ? 'text-blue-600 scale-110' : 'text-gray-400 group-hover:text-blue-600'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium">{section.title}</span>
                      <span className="text-xs text-gray-500 group-hover:text-gray-600">{section.description}</span>
                    </div>
                    <ChevronRightIcon className={`h-4 w-4 ml-2 transition-all duration-200 ${
                      activeSection === section.id ? 'opacity-100 rotate-90' : 'opacity-0 group-hover:opacity-100'
                    }`} />
                  </a>
                ))}
              </nav>
              
                {/* Quick Actions */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h4>
                  <div className="space-y-2">
                    <Link to="/auth" className="flex items-center px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-medium shadow-md hover:shadow-lg">
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      Get Started
                    </Link>
                    <a href="#api-reference" className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                      <CodeBracketIcon className="h-4 w-4 mr-2" />
                      View API Reference
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Mobile Optimized */}
          <div className="xl:col-span-4 order-1 xl:order-2">
            <div className="space-y-12 sm:space-y-16 lg:space-y-20">
                
                {/* Getting Started - Mobile Optimized */}
                <section id="getting-started" className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden mx-2 sm:mx-0">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                      <div className="flex items-center text-white">
                        <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl mr-3 sm:mr-4 flex-shrink-0">
                          <RocketLaunchIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold mb-1 sm:mb-2 leading-tight">Getting Started</h2>
                          <p className="text-blue-100 text-sm sm:text-base lg:text-lg leading-snug">Deploy your first container in under 60 seconds</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                        {/* Prerequisites */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-blue-200/50">
                          <div className="flex items-center mb-3 sm:mb-4">
                            <ShieldCheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
                            <h3 className="text-base sm:text-lg font-bold text-blue-900">Prerequisites</h3>
                          </div>
                          <ul className="space-y-2 sm:space-y-3">
                            {[
                              'A Docker image (public or private)',
                              'A Container Engine account',
                              'An API key from your dashboard'
                            ].map((item, index) => (
                              <li key={index} className="flex items-center text-blue-800 text-sm sm:text-base">
                                <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Benefits */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-green-200/50">
                          <div className="flex items-center mb-3 sm:mb-4">
                            <BoltIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mr-2 sm:mr-3 flex-shrink-0" />
                            <h3 className="text-base sm:text-lg font-bold text-green-900">Why Container Engine?</h3>
                          </div>
                          <ul className="space-y-2 sm:space-y-3">
                            {[
                              'Deploy globally in seconds, not minutes',
                              'Auto-scaling & load balancing included',
                              'Built-in monitoring & aggregated logs'
                            ].map((item, index) => (
                              <li key={index} className="flex items-center text-green-800 text-sm sm:text-base">
                                <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Quick Start Steps - Mobile Optimized */}
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                          <GlobeAltIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
                          <span className="leading-tight">4-Step Deployment Process</span>
                        </h3>
                        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                          {[
                            { step: 1, title: 'Sign Up', description: 'Create your free account', icon: '👤', color: 'from-blue-500 to-blue-600' },
                            { step: 2, title: 'Get API Key', description: 'Generate a key from your dashboard', icon: '🔑', color: 'from-indigo-500 to-indigo-600' },
                            { step: 3, title: 'Deploy Container', description: 'Make a single API call', icon: '🚀', color: 'from-purple-500 to-purple-600' },
                            { step: 4, title: 'Access Your App', description: 'Visit the provided URL', icon: '🌐', color: 'from-green-500 to-green-600' }
                          ].map((item) => (
                            <div key={item.step} className="group relative">
                              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg mb-3 sm:mb-4 mx-auto shadow-lg`}>
                                  <span className="text-lg sm:text-2xl">{item.icon}</span>
                                </div>
                                <div className="text-center">
                                  <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base leading-tight">{item.title}</h4>
                                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{item.description}</p>
                                </div>
                              </div>
                              {item.step < 4 && (
                                <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                                  <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-300" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                         <p className="text-center text-sm text-gray-600 mt-6">
                            For detailed API calls, please see the <a href="#api-reference" className="text-blue-600 font-medium hover:underline">API Reference section</a>.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Authentication Conceptual Guide */}
                <section id="authentication" className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24">
                    <div className="flex items-center mb-4 lg:mb-6">
                        <KeyIcon className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mr-2 lg:mr-3" />
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">Authentication</h2>
                    </div>
                    <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed">
                        <p>
                            Access to the Container Engine API is controlled by API keys. You can manage these keys through your user dashboard after registering an account.
                            All API requests must include an `Authorization` header with your API key.
                        </p>
                        <p>
                            There are two main types of authentication:
                        </p>
                         <ul className="list-disc list-inside space-y-2 pl-4">
                            <li><strong>User Account Authentication:</strong> To manage your account, billing, and API keys, you first need to <a href="#api-auth-register" className="text-blue-600 font-medium hover:underline">register</a> and <a href="#api-auth-login" className="text-blue-600 font-medium hover:underline">log in</a>. This process provides you with a JWT (JSON Web Token) that authenticates you for account-level actions, such as creating new API keys.</li>
                            <li><strong>API Key Authentication:</strong> For all programmatic actions, such as deploying containers or managing services, you will use a generated API key. This key is a long-lived token that you should treat like a password. You include it in your requests as a Bearer token in the `Authorization` header.</li>
                        </ul>
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 sm:p-6 mt-4">
                            <div className="flex items-start">
                                <ShieldCheckIcon className="h-6 w-6 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                                <div>
                                <h4 className="font-bold text-amber-900 mb-2">Security Best Practices</h4>
                                <ul className="text-amber-800 text-sm space-y-1 list-disc list-inside">
                                    <li>Store API keys securely, preferably in an environment variable or secrets manager.</li>
                                    <li>Use different API keys for different environments (e.g., development, production).</li>
                                    <li>Rotate your API keys periodically to enhance security.</li>
                                    <li>Never commit API keys directly into your version control system (like Git).</li>
                                </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Deployment Guide Conceptual */}
                <section id="deployment-guide" className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24">
                     <div className="flex items-center mb-4 lg:mb-6">
                        <ServerIcon className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mr-2 lg:mr-3" />
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">Deployment Guide</h2>
                    </div>
                     <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed">
                        <p>
                           Deploying an application on Container Engine involves providing a container image and some basic configuration. Our system handles the rest, from provisioning resources to networking and scaling.
                        </p>
                        <h4 className="text-lg font-bold text-gray-800 pt-2">Core Concepts</h4>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li><strong>Image:</strong> You must provide a publicly or privately accessible container image (e.g., from Docker Hub, GCR, or your own registry). This image contains your application and all its dependencies.</li>
                            <li><strong>Replicas:</strong> This determines how many instances of your container are running. We automatically balance traffic between them for high availability. You can scale this number up or down at any time.</li>
                            <li><strong>Ports:</strong> Specify which port your application listens on inside the container. We will automatically expose it to the internet via HTTP (80) and HTTPS (443).</li>
                            <li><strong>Environment Variables:</strong> A secure way to provide configuration to your application without hardcoding it. You can manage these variables via the API. Any changes will trigger a zero-downtime rolling restart to apply them.</li>
                            <li><strong>Domain:</strong> By default, we provide a `.decenter.run` subdomain for your application. You can also configure custom domains.</li>
                        </ul>
                         <p>
                            To see the detailed API calls for creating and managing deployments, please refer to the <a href="#api-deployments" className="text-blue-600 font-medium hover:underline">Deployments API Reference</a>.
                        </p>
                    </div>
                </section>

                {/* Webhooks Conceptual Guide */}
                <section id="webhooks" className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24">
                    <div className="flex items-center mb-4 lg:mb-6">
                        <BellIcon className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mr-2 lg:mr-3" />
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">Webhooks</h2>
                    </div>
                    <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed">
                        <p>
                            Webhooks allow you to receive real-time HTTP notifications about events happening with your deployments. You can subscribe to various events, such as when a deployment is created, fails, or successfully starts.
                        </p>
                        <p>
                            To use webhooks, you provide a URL endpoint that we will send `POST` requests to. These requests will contain a JSON payload with details about the event. You can also provide an optional secret to verify that the requests are coming from Container Engine.
                        </p>
                        <h4 className="text-lg font-bold text-gray-800 pt-2">Available Events</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                           {[
                                'deployment.created', 'deployment.updated', 'deployment.started',
                                'deployment.stopped', 'deployment.failed', 'deployment.restarted'
                           ].map(event => (
                               <div key={event} className="flex items-center bg-blue-50 border border-blue-200/50 rounded-md px-3 py-1.5">
                                 <code className="text-blue-800">{event}</code>
                               </div>
                           ))}
                        </div>
                         <p>
                            For instructions on how to create and manage webhooks, see the <a href="#api-webhooks" className="text-blue-600 font-medium hover:underline">Webhooks API Reference</a>.
                        </p>
                    </div>
                </section>

                 {/* Configuration Section */}
                <section id="configuration" className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24">
                  <div className="flex items-center mb-4 lg:mb-6">
                    <CogIcon className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mr-2 lg:mr-3" />
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">Advanced Configuration</h2>
                  </div>
                  <div className="space-y-6 text-gray-700 text-sm sm:text-base leading-relaxed">
                    <div>
                      <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">Health Checks</h3>
                      <p>
                        You can configure custom health check endpoints to ensure your application is running correctly. Container Engine will periodically send requests to this endpoint. If it fails to respond successfully a number of times, the container will be automatically restarted.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">Resource Limits</h3>
                      <p>
                        To ensure optimal performance and manage costs, you can set specific CPU and memory limits for your deployments. This prevents a single application from consuming excessive resources and guarantees a baseline level of performance.
                      </p>
                    </div>
                    <p>
                        These options can be configured when creating or updating a deployment. Check the <a href="#api-deployments-create" className="text-blue-600 font-medium hover:underline">Create Deployment endpoint</a> in the API Reference for the full schema.
                    </p>
                  </div>
                </section>
                
                {/* --- API REFERENCE --- */}
<section id="api-reference" className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24">
  <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center text-white">
            <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl mr-3 sm:mr-4 flex-shrink-0">
                <CodeBracketIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold mb-1 sm:mb-2 leading-tight">API Reference</h2>
                <p className="text-gray-300 text-sm sm:text-base lg:text-lg leading-snug">Detailed endpoints for interacting with the Container Engine API.</p>
            </div>
        </div>
    </div>

    <div className="p-4 sm:p-6 lg:p-8 space-y-12">
        {/* Base URL */}
        <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Base URL</h3>
            <code className="text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-sm break-all">
                https://decenter.run/v1
            </code>
        </div>

        {/* ================================================================== */}
        {/* Authentication Endpoints */}
        {/* ================================================================== */}
        <div id="api-authentication" className="space-y-8 scroll-mt-24">
              <h3 className="text-2xl font-bold text-gray-900 border-b pb-3">Authentication</h3>
              
              {/* Register */}
            <div id="api-auth-register" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Register User</h4>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /auth/register</span>
                </div>
                <p className="text-sm text-gray-600">Creates a new user account.</p>
                {/* ... existing curl block ... */}
            </div>

              {/* Login */}
            <div id="api-auth-login" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Login</h4>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /auth/login</span>
                </div>
                <p className="text-sm text-gray-600">Authenticates a user and returns JWT access and refresh tokens.</p>
                {/* ... existing curl block ... */}
            </div>

            {/* Refresh Token */}
            <div id="api-auth-refresh" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-semibold text-gray-800">Refresh Access Token</h4>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /auth/refresh</span>
                </div>
                <p className="text-sm text-gray-600">Uses a refresh token to issue a new access token.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X POST ...`, 'refresh')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'refresh' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X POST https://decenter.run/v1/auth/refresh \\
-H "Content-Type: application/json" \\
-d '{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}'`}</pre>
                </div>
            </div>

            {/* Logout */}
            <div id="api-auth-logout" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-semibold text-gray-800">Logout</h4>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /auth/logout</span>
                </div>
                <p className="text-sm text-gray-600">Invalidates the user's refresh token, effectively logging them out.</p>
                 <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X POST ...`, 'logout')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'logout' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X POST https://decenter.run/v1/auth/logout \\
-H "Content-Type: application/json" \\
-d '{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}'`}</pre>
                </div>
            </div>
        </div>

        {/* ================================================================== */}
        {/* API Keys Endpoints */}
        {/* ================================================================== */}
        <div id="api-keys" className="space-y-8 scroll-mt-24">
             <h3 className="text-2xl font-bold text-gray-900 border-b pb-3">API Keys</h3>
             
            {/* List API Keys */}
            <div id="api-keys-list" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">List API Keys</h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /api-keys</span>
                </div>
                <p className="text-sm text-gray-600">Retrieves a list of all API keys for the authenticated user.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X GET ...`, 'listkeys')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'listkeys' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X GET https://decenter.run/v1/api-keys \\
-H "Authorization: Bearer <JWT_ACCESS_TOKEN>"`}</pre>
                </div>
            </div>

            {/* Create API Key */}
            <div id="api-keys-create" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Create API Key</h4>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /api-keys</span>
                </div>
                <p className="text-sm text-gray-600">Generates a new API key for programmatic access.</p>
                {/* ... existing curl block ... */}
            </div>

            {/* Revoke API Key */}
            <div id="api-keys-revoke" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Revoke API Key</h4>
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full whitespace-nowrap">DELETE /api-keys/{'{key_id}'}</span>
                </div>
                <p className="text-sm text-gray-600">Permanently deletes an API key.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X DELETE ...`, 'revokekey')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'revokekey' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X DELETE https://decenter.run/v1/api-keys/key_1a2b3c4d5e \\
-H "Authorization: Bearer <JWT_ACCESS_TOKEN>"`}</pre>
                </div>
            </div>
        </div>

        {/* ================================================================== */}
        {/* User Profile Endpoints */}
        {/* ================================================================== */}
        <div id="api-user" className="space-y-8 scroll-mt-24">
             <h3 className="text-2xl font-bold text-gray-900 border-b pb-3">User Profile</h3>
             
            {/* Get User Profile */}
            <div id="api-user-get" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Get User Profile</h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /user/profile</span>
                </div>
                <p className="text-sm text-gray-600">Retrieves the profile information of the authenticated user.</p>
                 <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X GET ...`, 'getprofile')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'getprofile' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X GET https://decenter.run/v1/user/profile \\
-H "Authorization: Bearer <JWT_ACCESS_TOKEN>"`}</pre>
                </div>
            </div>

             {/* Update User Profile */}
            <div id="api-user-update" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Update User Profile</h4>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full whitespace-nowrap">PUT /user/profile</span>
                </div>
                <p className="text-sm text-gray-600">Updates the profile information of the authenticated user.</p>
                 <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X PUT ...`, 'updateprofile')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'updateprofile' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X PUT https://decenter.run/v1/user/profile \\
-H "Authorization: Bearer <JWT_ACCESS_TOKEN>" \\
-H "Content-Type: application/json" \\
-d '{
  "username": "new_username",
  "email": "new.email@example.com"
}'`}</pre>
                </div>
            </div>

            {/* Change Password */}
            <div id="api-user-password" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Change Password</h4>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full whitespace-nowrap">PUT /user/password</span>
                </div>
                <p className="text-sm text-gray-600">Changes the password for the authenticated user.</p>
                 <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X PUT ...`, 'changepass')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'changepass' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X PUT https://decenter.run/v1/user/password \\
-H "Authorization: Bearer <JWT_ACCESS_TOKEN>" \\
-H "Content-Type: application/json" \\
-d '{
  "current_password": "MySecure123!",
  "new_password": "ANewVerySecurePassword456!",
  "confirm_new_password": "ANewVerySecurePassword456!"
}'`}</pre>
                </div>
            </div>
        </div>

        {/* ================================================================== */}
        {/* Deployments Endpoints */}
        {/* ================================================================== */}
        <div id="api-deployments" className="space-y-8 scroll-mt-24">
             <h3 className="text-2xl font-bold text-gray-900 border-b pb-3">Deployments</h3>

            {/* List Deployments */}
            <div id="api-deployments-list" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">List Deployments</h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /deployments</span>
                </div>
                <p className="text-sm text-gray-600">Retrieves a paginated list of all deployments for the authenticated user.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X GET ...`, 'listdeploy')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'listdeploy' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X GET "https://decenter.run/v1/deployments?page=1&limit=10" \\
-H "Authorization: Bearer <YOUR_API_KEY>"`}</pre>
                </div>
            </div>

            {/* Create Deployment */}
            <div id="api-deployments-create" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Create Deployment</h4>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /deployments</span>
                </div>
                <p className="text-sm text-gray-600">Creates and starts a new deployment from a container image.</p>
                {/* ... existing curl block ... */}
            </div>

            {/* Get Deployment Details */}
            <div id="api-deployments-get" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-semibold text-gray-800">Get Deployment Details</h4>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /deployments/{'{deployment_id}'}</span>
                </div>
                <p className="text-sm text-gray-600">Retrieves the full details of a specific deployment.</p>
                {/* ... existing curl block for Get Deployment ... */}
            </div>
             
            {/* Update Deployment */}
            <div id="api-deployments-update" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Update Deployment</h4>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full whitespace-nowrap">PUT /deployments/{'{deployment_id}'}</span>
                </div>
                <p className="text-sm text-gray-600">Updates a deployment's configuration, such as its image or replica count. This triggers a redeployment.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X PUT ...`, 'updatedeploy')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'updatedeploy' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X PUT https://decenter.run/v1/deployments/dep_9f8e7d6c \\
-H "Authorization: Bearer <YOUR_API_KEY>" \\
-H "Content-Type: application/json" \\
-d '{
  "image": "nginx:1.22-alpine",
  "replicas": 3
}'`}</pre>
                </div>
            </div>

            {/* Delete Deployment */}
            <div id="api-deployments-delete" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Delete Deployment</h4>
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full whitespace-nowrap">DELETE /deployments/{'{deployment_id}'}</span>
                </div>
                <p className="text-sm text-gray-600">Stops and permanently deletes a deployment and all associated resources.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X DELETE ...`, 'deletedeploy')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'deletedeploy' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X DELETE https://decenter.run/v1/deployments/dep_9f8e7d6c \\
-H "Authorization: Bearer <YOUR_API_KEY>"`}</pre>
                </div>
            </div>

            {/* Scale Deployment */}
            <div id="api-deployments-scale" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Scale Deployment</h4>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full whitespace-nowrap">PATCH /deployments/{'{deployment_id}'}/scale</span>
                </div>
                <p className="text-sm text-gray-600">Adjusts the number of running instances (replicas) for a deployment.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X PATCH ...`, 'scaledeploy')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'scaledeploy' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X PATCH https://decenter.run/v1/deployments/dep_9f8e7d6c/scale \\
-H "Authorization: Bearer <YOUR_API_KEY>" \\
-H "Content-Type: application/json" \\
-d '{
  "replicas": 5
}'`}</pre>
                </div>
            </div>

            {/* Start Deployment */}
            <div id="api-deployments-start" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Start Deployment</h4>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /deployments/{'{deployment_id}'}/start</span>
                </div>
                <p className="text-sm text-gray-600">Starts a stopped deployment.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X POST ...`, 'startdeploy')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'startdeploy' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X POST https://decenter.run/v1/deployments/dep_9f8e7d6c/start \\
-H "Authorization: Bearer <YOUR_API_KEY>"`}</pre>
                </div>
            </div>

             {/* Stop Deployment */}
            <div id="api-deployments-stop" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Stop Deployment</h4>
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /deployments/{'{deployment_id}'}/stop</span>
                </div>
                <p className="text-sm text-gray-600">Stops a running deployment by scaling it down to zero replicas.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X POST ...`, 'stopdeploy')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'stopdeploy' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X POST https://decenter.run/v1/deployments/dep_9f8e7d6c/stop \\
-H "Authorization: Bearer <YOUR_API_KEY>"`}</pre>
                </div>
            </div>
             
            {/* Restart Deployment */}
            <div id="api-deployments-restart" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Restart Deployment</h4>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /deployments/{'{deployment_id}'}/restart</span>
                </div>
                <p className="text-sm text-gray-600">Initiates a zero-downtime rolling restart for a deployment.</p>
                {/* ... existing curl block ... */}
            </div>

        </div>

        {/* ================================================================== */}
        {/* Environment Variables Endpoints */}
        {/* ================================================================== */}
        <div id="api-env" className="space-y-8 scroll-mt-24">
             <h3 className="text-2xl font-bold text-gray-900 border-b pb-3">Environment Variables</h3>
             
            {/* Get Environment Variables */}
            <div id="api-env-get" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-semibold text-gray-800">Get Environment Variables</h4>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /deployments/{'{deployment_id}'}/env</span>
                </div>
                <p className="text-sm text-gray-600">Retrieves all environment variables for a specific deployment.</p>
                {/* ... existing curl block ... */}
            </div>

            {/* Update Environment Variables */}
            <div id="api-env-update" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-semibold text-gray-800">Update Environment Variables</h4>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full whitespace-nowrap">PATCH /deployments/{'{deployment_id}'}/env</span>
                </div>
                <p className="text-sm text-gray-600">Adds or updates environment variables for a deployment. This triggers a zero-downtime restart to apply the changes.</p>
                {/* ... existing curl block ... */}
            </div>
        </div>
        
        {/* ================================================================== */}
        {/* Domains Endpoints */}
        {/* ================================================================== */}
        <div id="api-domains" className="space-y-8 scroll-mt-24">
             <h3 className="text-2xl font-bold text-gray-900 border-b pb-3">Custom Domains</h3>

            {/* List Domains */}
            <div id="api-domains-list" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-semibold text-gray-800">List Custom Domains</h4>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /deployments/{'{deployment_id}'}/domains</span>
                </div>
                <p className="text-sm text-gray-600">Lists all custom domains associated with a deployment.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X GET ...`, 'listdomains')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'listdomains' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X GET https://decenter.run/v1/deployments/dep_9f8e7d6c/domains \\
-H "Authorization: Bearer <YOUR_API_KEY>"`}</pre>
                </div>
            </div>

            {/* Add Domain */}
            <div id="api-domains-add" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-semibold text-gray-800">Add Custom Domain</h4>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /deployments/{'{deployment_id}'}/domains</span>
                </div>
                <p className="text-sm text-gray-600">Adds a custom domain to a deployment and begins the verification process. Returns the necessary DNS records for configuration.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X POST ...`, 'adddomain')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'adddomain' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X POST https://decenter.run/v1/deployments/dep_9f8e7d6c/domains \\
-H "Authorization: Bearer <YOUR_API_KEY>" \\
-H "Content-Type: application/json" \\
-d '{
  "domain": "www.my-awesome-app.com"
}'`}</pre>
                </div>
            </div>

            {/* Remove Domain */}
            <div id="api-domains-remove" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-semibold text-gray-800">Remove Custom Domain</h4>
                    <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full whitespace-nowrap">DELETE /deployments/{'{deployment_id}'}/domains/{'{domain_id}'}</span>
                </div>
                <p className="text-sm text-gray-600">Removes a custom domain from a deployment.</p>
                 <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X DELETE ...`, 'removedomain')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'removedomain' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X DELETE https://decenter.run/v1/deployments/dep_9f8e7d6c/domains/dom_12345678 \\
-H "Authorization: Bearer <YOUR_API_KEY>"`}</pre>
                </div>
            </div>
        </div>
        
        {/* ================================================================== */}
        {/* Logs Endpoints */}
        {/* ================================================================== */}
        <div id="api-logs" className="space-y-8 scroll-mt-24">
             <h3 className="text-2xl font-bold text-gray-900 border-b pb-3">Logs</h3>

            {/* Get Logs */}
            <div id="api-logs-get" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-semibold text-gray-800">Get Deployment Logs</h4>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /deployments/{'{deployment_id}'}/logs</span>
                </div>
                <p className="text-sm text-gray-600">Retrieves historical logs for all pods in a deployment.</p>
                 <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X GET ...`, 'getlogs')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'getlogs' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X GET "https://decenter.run/v1/deployments/dep_9f8e7d6c/logs?limit=100" \\
-H "Authorization: Bearer <YOUR_API_KEY>"`}</pre>
                </div>
            </div>

            {/* Stream Logs */}
            <div id="api-logs-stream" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-semibold text-gray-800">Stream Deployment Logs</h4>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /deployments/{'{deployment_id}'}/logs/stream</span>
                </div>
                <p className="text-sm text-gray-600">Establishes a WebSocket connection to stream real-time logs from a deployment.</p>
            </div>
        </div>

        {/* ================================================================== */}
        {/* Webhooks Endpoints */}
        {/* ================================================================== */}
        <div id="api-webhooks" className="space-y-8 scroll-mt-24">
             <h3 className="text-2xl font-bold text-gray-900 border-b pb-3">Webhooks</h3>
             
            {/* List Webhooks */}
            <div id="api-webhooks-list" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">List Webhooks</h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /webhooks</span>
                </div>
                <p className="text-sm text-gray-600">Retrieves a list of all webhooks configured for the user.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X GET ...`, 'listwebhooks')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'listwebhooks' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X GET https://decenter.run/v1/webhooks \\
-H "Authorization: Bearer <YOUR_API_KEY>"`}</pre>
                </div>
            </div>

            {/* Create Webhook */}
            <div id="api-webhooks-create" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Create Webhook</h4>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full whitespace-nowrap">POST /webhooks</span>
                </div>
                <p className="text-sm text-gray-600">Creates a new webhook endpoint to receive notifications for deployment events.</p>
                {/* ... existing curl block ... */}
            </div>

            {/* Get Webhook */}
            <div id="api-webhooks-get" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Get Webhook Details</h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /webhooks/{'{webhook_id}'}</span>
                </div>
                <p className="text-sm text-gray-600">Retrieves the details of a specific webhook.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X GET ...`, 'getwebhook')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'getwebhook' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X GET https://decenter.run/v1/webhooks/wh_1a2b3c4d \\
-H "Authorization: Bearer <YOUR_API_KEY>"`}</pre>
                </div>
            </div>

            {/* Update Webhook */}
            <div id="api-webhooks-update" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Update Webhook</h4>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full whitespace-nowrap">PUT /webhooks/{'{webhook_id}'}</span>
                </div>
                <p className="text-sm text-gray-600">Updates a webhook's configuration, such as its URL or subscribed events.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X PUT ...`, 'updatewebhook')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'updatewebhook' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X PUT https://decenter.run/v1/webhooks/wh_1a2b3c4d \\
-H "Authorization: Bearer <YOUR_API_KEY>" \\
-H "Content-Type: application/json" \\
-d '{
  "url": "https://new-app.com/webhook",
  "events": ["deployment.started", "deployment.stopped"],
  "active": false
}'`}</pre>
                </div>
            </div>

            {/* Delete Webhook */}
            <div id="api-webhooks-delete" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">Delete Webhook</h4>
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full whitespace-nowrap">DELETE /webhooks/{'{webhook_id}'}</span>
                </div>
                <p className="text-sm text-gray-600">Deletes a webhook.</p>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                        <span className="text-gray-300 text-sm font-medium">cURL Request</span>
                        <button onClick={() => copyToClipboard(`curl -X DELETE ...`, 'deletewebhook')} className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">{copiedSection === 'deletewebhook' ? <><CheckIcon className="h-4 w-4 text-green-400" /><span>Copied!</span></> : <><ClipboardDocumentIcon className="h-4 w-4" /><span>Copy</span></>}</button>
                    </div>
                    <pre className="p-4 text-green-400 text-sm overflow-x-auto">{`curl -X DELETE https://decenter.run/v1/webhooks/wh_1a2b3c4d \\
-H "Authorization: Bearer <YOUR_API_KEY>"`}</pre>
                </div>
            </div>
        </div>

        {/* ================================================================== */}
        {/* Notifications Endpoint */}
        {/* ================================================================== */}
        <div id="api-notifications" className="space-y-8 scroll-mt-24">
             <h3 className="text-2xl font-bold text-gray-900 border-b pb-3">Real-time Notifications</h3>
             
            {/* WebSocket Notifications */}
            <div id="api-notifications-ws" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xl font-semibold text-gray-800">WebSocket Notifications</h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">GET /ws/notifications</span>
                </div>
                <p className="text-sm text-gray-600">Establishes a WebSocket connection to receive real-time notifications about events related to your account and deployments.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h5 className="font-bold text-blue-900 mb-2">Connection URL</h5>
                    <pre className="text-blue-800 text-sm overflow-x-auto">wss://decenter.run/v1/ws/notifications</pre>
                    <p className="text-blue-800 text-sm mt-2">
                        <strong>Note:</strong> You must include your JWT access token as a query parameter for authentication, like so: `?token={'{jwt_access_token}'}`.
                    </p>
                </div>
            </div>
        </div>
    </div>
  </div>
</section>

            </div>
          </div>
        </div>
      </div>

      {/* Modern Footer */}
      <footer className="relative mt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900"></div>
        <div className="relative">
          {/* Decorative top border */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          <div className="py-12 lg:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
                {/* Brand Section */}
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur-sm opacity-50"></div>
                      <img src="/open-container-engine-logo.png" alt="Container Engine" className="relative rounded-xl w-10 h-10 object-cover shadow-lg" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Container Engine
                    </span>
                  </div>
                  <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                    The modern, open-source alternative to Google Cloud Run. 
                    Deploy containers instantly with enterprise-grade security and performance.
                  </p>
                  <div className="flex space-x-4">
                    <Link to="/auth" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                      Get Started Free
                    </Link>
                    <a href="https://github.com/decenter-ai/container-engine" className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-200 font-semibold border border-white/20">
                      View on GitHub
                    </a>
                  </div>
                </div>

                {/* Quick Links */}
                <div>
                  <h4 className="text-white font-bold text-lg mb-6">Product</h4>
                  <ul className="space-y-3">
                    <li><Link to="/" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Home</Link></li>
                    <li><Link to="/features" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Features</Link></li>
                    <li><Link to="/documentation" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Documentation</Link></li>
                    <li><Link to="/pricing" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Pricing</Link></li>
                  </ul>
                </div>

                {/* Support */}
                <div>
                  <h4 className="text-white font-bold text-lg mb-6">Support</h4>
                  <ul className="space-y-3">
                    <li><Link to="/support" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Help Center</Link></li>
                    <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Contact Us</Link></li>
                    <li><Link to="/status" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">System Status</Link></li>
                    <li><Link to="/privacy" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Privacy Policy</Link></li>
                  </ul>
                </div>
              </div>
              
              {/* Bottom Section */}
              <div className="mt-12 pt-8 border-t border-white/10">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                  <p className="text-gray-400 text-sm">
                    &copy; {new Date().getFullYear()} Container Engine by Decenter.AI. All rights reserved.
                  </p>
                  <div className="flex items-center space-x-6">
                    <span className="text-sm text-gray-400">Built with ❤️ for developers</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-400">All systems operational</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DocumentationPage;