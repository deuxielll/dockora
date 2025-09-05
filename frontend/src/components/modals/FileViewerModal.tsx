import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { getFileContent, viewFile } from '../../services/api';
import SimpleCodeEditor from '../SimpleCodeEditor';
import LoadingSpinner from '../LoadingSpinner';

const API_BASE_URL = `http://${window.location.hostname}:5000/api`;

const getFileType = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) return 'audio';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(extension)) return 'image';
    if (['pdf'].includes(extension)) return 'pdf';
    
    const textBasedExtensions = [
        // Documents
        'txt', 'md', 'rtf', 'tex',
        // Spreadsheets
        'csv', 'tsv',
        // Existing code-like files
        'yml', 'yaml', 'json', 'sh', 'py', 'js', 'jsx', 'html', 'css', 'dockerfile', 'log'
    ];

    if (textBasedExtensions.includes(extension)) return 'code';
    
    return 'unsupported';
};

const FileViewerModal = ({ item, onClose }) => {
    const [textContent, setTextContent] = useState('');
    const [mediaUrl, setMediaUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fileType = getFileType(item.name);
    const downloadUrl = `${API_BASE_URL}/files/view?path=${encodeURIComponent(item.path)}`;

    useEffect(() => {
        let objectUrl = null;
        const loadFile = async () => {
            setIsLoading(true);
            setError('');
            try {
                if (fileType === 'code') {
                    const res = await getFileContent(item.path);
                    setTextContent(res.data.content);
                } else if (fileType === 'video' || fileType === 'audio' || fileType === 'image' || fileType === 'pdf') {
                    const res = await viewFile(item.path);
                    objectUrl = URL.createObjectURL(res.data);
                    setMediaUrl(objectUrl);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load file.');
            } finally {
                setIsLoading(false);
            }
        };
        
        loadFile();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [item.path, fileType]);

    const renderContent = () => {
        if (isLoading) return <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div>;
        if (error) return <div className="flex-grow flex items-center justify-center text-red-500">{error}</div>;

        switch (fileType) {
            case 'video':
                return <video src={mediaUrl} controls className="w-full h-full max-h-[75vh] rounded-lg" />;
            case 'audio':
                return <audio src={mediaUrl} controls className="w-full mt-4" />;
            case 'image':
                return <img src={mediaUrl} alt={item.name} className="max-w-full max-h-[75vh] object-contain mx-auto rounded-lg" />;
            case 'pdf':
                return <iframe src={mediaUrl} title={item.name} className="w-full h-full min-h-[75vh] border-0 rounded-lg" />;
            case 'code':
                return (
                    <div className="rounded-lg flex-grow w-full h-full overflow-hidden">
                        <SimpleCodeEditor value={textContent} onChange={() => {}} />
                    </div>
                );
            default:
                return (
                    <div className="text-center p-8">
                        <p className="mb-4 text-gray-400">No preview available for this file type.</p>
                        <a href={downloadUrl} download={item.name} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                            <Download size={16} /> Download File
                        </a>
                    </div>
                );
        }
    };
    
    const modalBg = 'bg-dark-bg';
    const textColor = 'text-gray-200';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${modalBg} shadow-neo rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`font-bold text-lg ${textColor} truncate pr-4`}>
                        {item.name}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700/50 transition-colors"><X size={20} /></button>
                </div>
                <div className="flex-grow flex items-center justify-center overflow-auto no-scrollbar">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default FileViewerModal;