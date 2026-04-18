import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setProfile } from '../store/slices/userSlice';
import userService from '../services/api/userService';
import Navbar from '../components/Navbar/Navbar';
import toast from 'react-hot-toast';

function UploadImagePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.user);
  const [preview, setPreview] = useState(profile?.imageUrl || null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select an image');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await userService.uploadImage(formData, token);
      dispatch(setProfile(response.user));
      toast.success('Profile image updated successfully');
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(profile?.imageUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Upload Profile Image</h1>
          <p className="text-gray-500 font-medium">Update your profile picture</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <div className="flex flex-col items-center">
            <div className="w-48 h-48 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mb-6">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-24 h-24 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-black text-white rounded-lg font-black uppercase tracking-wider hover:bg-gray-800 transition-all"
              >
                Choose Image
              </button>

              {file && (
                <>
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-black uppercase tracking-wider hover:bg-green-700 transition-all disabled:bg-gray-300"
                  >
                    {loading ? 'Uploading...' : 'Upload'}
                  </button>

                  <button
                    onClick={handleRemove}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-black uppercase tracking-wider hover:bg-red-700 transition-all"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-4 text-center">
              Supported formats: JPG, PNG, GIF (Max 5MB)
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate('/profile')}
            className="text-sm font-bold text-gray-600 hover:text-black transition-colors"
          >
            Back to Profile
          </button>
        </div>
      </main>
    </div>
  );
}

export default UploadImagePage;
