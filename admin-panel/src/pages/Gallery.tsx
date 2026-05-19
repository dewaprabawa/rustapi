import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssets, deleteAsset, uploadAsset } from '../services/api';
import { 
  Image as ImageIcon, 
  Film, 
  Music, 
  FileBox, 
  Trash2, 
  UploadCloud, 
  Loader2,
  ExternalLink,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Gallery() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: getAssets,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      await uploadAsset(file);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    } catch (err) {
      console.error('Failed to upload', err);
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAssets = assets.filter((asset: any) => 
    activeTab === 'all' ? true : asset.asset_type === activeTab
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Film className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      default: return <FileBox className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Media Gallery</h1>
            <p className="text-slate-500 mt-1">Manage and upload your lesson assets.</p>
          </div>
          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
              Upload Asset
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-slate-100 max-w-md">
          {['all', 'image', 'video', 'audio'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredAssets.map((asset: any) => {
              const id = asset._id?.$oid || asset.id;
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group flex flex-col"
                >
                  <div className="aspect-video bg-slate-100 relative flex items-center justify-center overflow-hidden">
                    {asset.asset_type === 'image' && (
                      <img src={asset.public_url} alt={asset.filename} className="w-full h-full object-cover" />
                    )}
                    {asset.asset_type === 'video' && (
                      <video src={asset.public_url} className="w-full h-full object-cover" />
                    )}
                    {asset.asset_type === 'audio' && (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                        <Music className="w-12 h-12" />
                        <audio src={asset.public_url} controls className="w-11/12 h-8" />
                      </div>
                    )}
                    {asset.asset_type === 'other' && (
                      <FileBox className="w-12 h-12 text-slate-300" />
                    )}
                    
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={asset.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-white/90 text-slate-700 rounded-lg hover:text-blue-600 shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this asset?')) {
                            deleteMutation.mutate(id);
                          }
                        }}
                        className="p-1.5 bg-white/90 text-slate-700 rounded-lg hover:text-red-600 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 text-slate-500">
                      {getIcon(asset.asset_type)}
                      <span className="text-xs font-semibold uppercase tracking-wider">{asset.asset_type}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate" title={asset.filename}>
                      {asset.filename}
                    </p>
                    
                    <button
                      onClick={() => copyUrl(asset.public_url, id)}
                      className="mt-4 w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {copiedId === id ? (
                        <><CheckCircle2 className="w-4 h-4 text-green-600" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4" /> Copy URL</>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100 border-dashed">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Assets Found</h3>
            <p className="text-slate-500">You haven't uploaded any {activeTab === 'all' ? '' : activeTab} assets yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
