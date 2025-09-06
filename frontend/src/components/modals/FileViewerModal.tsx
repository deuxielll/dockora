import React, { useState, useEffect } from 'react';
import { X, Download, Folder, FileText } from 'lucide-react'; // Added Folder and FileText icons
import { getFileContent, viewFile } from '../../services/api'; // Removed getSharedWithMeFileContent, viewSharedWithMeFile
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
    if (['zip'].includes(extension)) return 'zip'; // New: Recognize ZIP files
    
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
    const [zipContents, setZipContents] = useState([]); // New state for ZIP contents
    const [mediaUrl, setMediaUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fileType = getFileType(item.name);
    
    // Determine which API calls to use based on whether it's a shared item
    const fetchContentApi = getFileContent; // Simplified
    const viewFileApi = viewFile; // Simplified
    const downloadUrl = `${API_BASE_URL}/files/view?path=${encodeURIComponent(item.path)}`; // Simplified

    useEffect(() => {
        let objectUrl = null;
        const loadFile = async () => {
            setIsLoading(true);
            setError('');
            try {
                if (fileType === 'code' || fileType === 'zip') { // Handle ZIP files here
                    const res = await fetchContentApi(item.path);
                    if (res.data.type === 'zip_contents') {
                        setZipContents(res.data.contents);
                        setTextContent(''); // Clear text content if it's a zip
                    } else {
                        setTextContent(res.data.content);
                        setZipContents([]); // Clear zip contents if it's a text file
                    }
                } else if (fileType === 'video' || fileType === 'audio' || fileType === 'image' || fileType === 'pdf') {
                    const res = await viewFileApi(item.path);
                    objectUrl = URL.createObjectURL(res.data);
                    setMediaUrl(objectUrl);
                }
            } catch (err) {
                const errorMessage = err.response?.data?.error || 'Failed to load file.';
                setError(errorMessage);
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
    }, [item.path, fileType, fetchContentApi, viewFileApi]);

    const renderContent = () => {
        if (isLoading) return <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div>;
        
        const isFileTooLarge = error.includes("File is too large to display");

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
            case 'zip': // New: Render ZIP contents
                return (
                    <div className="flex-grow w-full h-full overflow-y-auto no-scrollbar p-2">
                        <h3 className="font-bold text-lg text-gray-200 mb-4">Contents of {item.name}</h3>
                        {zipContents.length > 0 ? (
                            <ul className="space-y-2">
                                {zipContents.map((zipItem, index) => (
                                    <li key={index} className="flex items-center gap-3 p-2 rounded-lg bg-dark-bg-secondary shadow-neo-inset">
                                        {zipItem.is_dir ? <Folder size={20} className="text-blue-400" /> : <FileText size={20} className="text-gray-400" />}
                                        <span className="font-medium text-gray-200 truncate">{zipItem.name}</span>
                                        {!zipItem.is_dir && <span className="text-sm text-gray-400 ml-auto">{formatSize(zipItem.size)}</span>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-400 py-8">This ZIP file is empty or could not be read.</p>
                        )}
                        <div className="text-center mt-6">
                            <a href={downloadUrl} download={item.name} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                                <Download size={16} /> Download ZIP
                            </a>
                        </div>
                    </div>
                );
            default:
                return null; // Should be caught by isFileTooLarge or fileType === 'unsupported'
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