import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, Folder, FileText, ArrowUp } from 'lucide-react'; // Added ArrowUp icon
import { getFileContent, viewFile, getSharedWithMeFileContent, viewSharedWithMeFile } from '../../services/api';
import SimpleCodeEditor from '../SimpleCodeEditor';
import LoadingSpinner from '../LoadingSpinner';

const API_BASE_URL = `http://${window.location.hostname}:5000/api`;

const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getFileType = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) return 'audio';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(extension)) return 'image';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['zip'].includes(extension)) return 'zip';
    
    const textBasedExtensions = [
        'txt', 'md', 'rtf', 'tex', 'csv', 'tsv', 'yml', 'yaml', 'json', 'sh', 'py', 'js', 'jsx', 'html', 'css', 'dockerfile', 'log'
    ];

    if (textBasedExtensions.includes(extension)) return 'code';
    
    return 'unsupported';
};

const FileViewerModal = ({ item, onClose }) => {
    const [textContent, setTextContent] = useState('');
    const [zipContents, setZipContents] = useState([]);
    const [mediaUrl, setMediaUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentZipPath, setCurrentZipPath] = useState('/'); // New state for path inside ZIP

    const fileType = getFileType(item.name);
    
    // Determine which API calls to use based on whether it's a shared item
    const fetchContentApi = item.isShared ? getSharedWithMeFileContent : getFileContent;
    const viewFileApi = item.isShared ? viewSharedWithMeFile : viewFile;

    const loadFile = useCallback(async (zipPath = '/') => {
        setIsLoading(true);
        setError('');
        setTextContent('');
        setZipContents([]);
        setMediaUrl(null);

        try {
            if (fileType === 'zip') {
                const res = await fetchContentApi(item.path, zipPath);
                if (res.data.type === 'zip_contents') {
                    setZipContents(res.data.contents);
                    setCurrentZipPath(res.data.current_zip_path);
                } else if (res.data.type === 'file_content') {
                    const subFileType = getFileType(zipPath.split('/').pop());
                    if (subFileType === 'code') {
                        setTextContent(res.data.content);
                    } else if (subFileType === 'binary') { // Placeholder for binary files within zip
                        setTextContent("Binary file content cannot be displayed directly.");
                    } else {
                        // For other media types within a zip, we'd need a way to stream/serve them
                        // For now, we'll just show a message or offer download
                        setTextContent(`Preview not available for '${subFileType}' files within ZIP. Please download.`);
                    }
                }
            } else if (fileType === 'code') {
                const res = await fetchContentApi(item.path);
                setTextContent(res.data.content);
            } else if (fileType === 'video' || fileType === 'audio' || fileType === 'image' || fileType === 'pdf') {
                const res = await viewFileApi(item.path);
                const objectUrl = URL.createObjectURL(res.data);
                setMediaUrl(objectUrl);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Failed to load file.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [item.path, item.isShared, fetchContentApi, viewFileApi, fileType]);

    useEffect(() => {
        loadFile(currentZipPath);
    }, [loadFile, currentZipPath]);

    const handleZipItemClick = (zipItem) => {
        if (zipItem.type === 'dir') {
            setCurrentZipPath(zipItem.path);
        } else {
            // If it's a file, load its content
            setCurrentZipPath(zipItem.path);
        }
    };

    const handleZipGoUp = () => {
        if (currentZipPath === '/') return;
        const lastSlashIndex = currentZipPath.lastIndexOf('/');
        const parentPath = lastSlashIndex === 0 ? '/' : currentZipPath.substring(0, lastSlashIndex);
        setCurrentZipPath(parentPath);
    };

    const renderZipContent = () => {
        const downloadZipUrl = item.isShared 
            ? `${API_BASE_URL}/files/shared-with-me/download?share_id=${item.path}`
            : `${API_BASE_URL}/files/view?path=${encodeURIComponent(item.path)}`;

        if (zipContents.length > 0) {
            const zipPathParts = currentZipPath.split('/').filter(Boolean);
            return (
                <div className="flex-grow w-full h-full flex flex-col p-2">
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-200">
                        {currentZipPath !== '/' && (
                            <button onClick={handleZipGoUp} className="p-1 rounded-full hover:shadow-neo-inset transition-all" title="Go Up">
                                <ArrowUp size={16} />
                            </button>
                        )}
                        <span>/</span>
                        {zipPathParts.map((part, index) => (
                            <React.Fragment key={part}>
                                <span className="px-2 py-1 rounded-md">{part}</span>
                                {index < zipPathParts.length - 1 && <span>/</span>}
                            </React.Fragment>
                        ))}
                    </div>
                    <ul className="space-y-2 flex-grow overflow-y-auto no-scrollbar">
                        {zipContents.map((zipItem, index) => (
                            <li key={index} 
                                onClick={() => handleZipItemClick(zipItem)}
                                className="flex items-center gap-3 p-2 rounded-lg bg-dark-bg-secondary shadow-neo-inset cursor-pointer hover:shadow-neo active:shadow-neo-inset transition-all"
                            >
                                {zipItem.type === 'dir' ? <Folder size={20} className="text-blue-400" /> : <FileText size={20} className="text-gray-400" />}
                                <span className="font-medium text-gray-200 truncate">{zipItem.name}</span>
                                {!zipItem.is_dir && <span className="text-sm text-gray-400 ml-auto">{formatSize(zipItem.size)}</span>}
                            </li>
                        ))}
                    </ul>
                    <div className="text-center mt-6 flex-shrink-0">
                        <a href={downloadZipUrl} download={item.name} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                            <Download size={16} /> Download ZIP
                        </a>
                    </div>
                </div>
            );
        } else if (textContent) {
            // Display content of a file within the zip
            return (
                <div className="flex-grow w-full h-full flex flex-col p-2">
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-200">
                        <button onClick={handleZipGoUp} className="p-1 rounded-full hover:shadow-neo-inset transition-all" title="Go Up">
                            <ArrowUp size={16} />
                        </button>
                        <span>/</span>
                        {currentZipPath.split('/').filter(Boolean).map((part, index, arr) => (
                            <React.Fragment key={part}>
                                <span className={`px-2 py-1 rounded-md ${index === arr.length - 1 ? 'font-bold' : ''}`}>{part}</span>
                                {index < arr.length - 1 && <span>/</span>}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="rounded-lg flex-grow w-full h-full overflow-hidden">
                        <SimpleCodeEditor value={textContent} onChange={() => {}} />
                    </div>
                    <div className="text-center mt-6 flex-shrink-0">
                        <a href={downloadZipUrl} download={item.name} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                            <Download size={16} /> Download ZIP
                        </a>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-400 p-8">
                <Folder size={48} className="mb-4" />
                <p>This ZIP file is empty or could not be read.</p>
                <div className="text-center mt-6 flex-shrink-0">
                    <a href={downloadZipUrl} download={item.name} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                        <Download size={16} /> Download ZIP
                    </a>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (isLoading) return <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div>;
        
        const isFileTooLarge = error.includes("File is too large to display");
        const downloadUrl = item.isShared 
            ? `${API_BASE_URL}/files/shared-with-me/download?share_id=${item.path}`
            : `${API_BASE_URL}/files/view?path=${encodeURIComponent(item.path)}`;

        if (error && !isFileTooLarge) return <div className="flex-grow flex items-center justify-center text-red-500">{error}</div>;

        if (isFileTooLarge || fileType === 'unsupported') {
            return (
                <div className="text-center p-8">
                    <p className="mb-4 text-gray-400">
                        {isFileTooLarge ? "This file is too large to display a preview." : "No preview available for this file type."}
                    </p>
                    <a href={downloadUrl} download={item.name} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                        <Download size={16} /> Download File
                    </a>
                </div>
            );
        }

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
            case 'zip':
                return renderZipContent();
            default:
                return null;
        }
    };
    
    const modalBg = 'bg-dark-bg';
    const textColor = 'text-gray-200';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${modalBg} shadow-neo rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`font-bold text-lg ${textColor} truncate pr-4`}>
                        {item.name} {item.isShared && item.sharer_name && <span className="text-sm text-gray-400"> (Shared by {item.sharer_name})</span>}
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