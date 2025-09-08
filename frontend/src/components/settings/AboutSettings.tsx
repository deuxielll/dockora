"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAboutContent } from '../../services/api';
import SettingsCard from './SettingsCard';
import LoadingSpinner from '../LoadingSpinner';

const AboutSettings = () => {
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await getAboutContent();
        setMarkdown(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load content.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, []);

  return (
    <SettingsCard title="About Dockora">
      <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-pre:bg-dark-bg-secondary prose-pre:shadow-neo-inset prose-pre:p-4 prose-pre:rounded-lg prose-headings:text-gray-200 prose-a:text-accent hover:prose-a:underline prose-strong:text-gray-200">
        {isLoading && <div className="flex justify-center"><LoadingSpinner /></div>}
        {error && <p className="text-red-500">{error}</p>}
        {!isLoading && !error && (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        )}
      </div>
    </SettingsCard>
  );
};

export default AboutSettings;