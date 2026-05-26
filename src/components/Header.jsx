import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPenNib, FaCog, FaSignOutAlt, FaUserShield } from 'react-icons/fa';
import { AiOutlineClockCircle, AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import { useAuth } from '../contexts/AuthContext';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import { logout } from '../utils/authSession';

export default function Header({ isRunning, startTime, elapsedSeconds }) {
  const { userName } = useAuth();
  const { toast } = useUiFeedback();
  const { isSchoolAdmin } = useTeacherStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (isRunning || (startTime && elapsedSeconds > 0)) {
      toast.warning('学習中はログアウトできません。終了してからお試しください。');
      return;
    }
    await logout();
    navigate('/', { replace: true });
  };

  const displayName = userName || 'ユーザー';

  return (
    <header className="bg-[#ede3d2] shadow-md fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between flex-wrap sm:flex-nowrap gap-2 sm:gap-4 min-h-16 sm:min-h-auto py-2 sm:py-3">
        <button
          type="button"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#5a3e28] text-[#fffaf3] rounded-full shadow-md border-2 border-[#fffaf3] ring-2 ring-offset-2 ring-[#fffaf3] hover:scale-105 hover:brightness-110 transition text-lg sm:text-2xl"
          onClick={() => navigate('/pomodoro')}
        >
          <AiOutlineClockCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="whitespace-nowrap">学習計測</span>
        </button>

        <div
          className="flex items-center gap-2 mx-auto cursor-pointer hover:opacity-80 transition order-last sm:order-none absolute left-1/2 transform -translate-x-1/2"
          onClick={() => {
            if (isRunning || (startTime && elapsedSeconds > 0)) {
              toast.warning('学習中は他の画面に移動できません。終了してから移動してください。');
              return;
            }
            navigate('/home');
          }}
        >
          <h1 className="text-4xl sm:text-6xl font-script text-[#5a3e28] drop-shadow-sm">
            TsureBen
          </h1>
          <FaPenNib className="text-[#5a3e28] w-8 h-8 sm:w-12 sm:h-12 mt-1" />
        </div>

        <div className="hidden sm:flex items-center gap-2 ml-auto">
          {isSchoolAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-[#fffaf3] bg-[#8f735a] px-3 py-2 rounded-full text-sm shadow-md hover:scale-105 transition"
              title="管理者ページ"
            >
              <FaUserShield className="w-4 h-4" />
              管理
            </button>
          )}
          {displayName && (
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 text-[#fffaf3] bg-[#5a3e28] px-4 py-2 rounded-full text-base sm:text-lg shadow-md hover:scale-105 transition whitespace-nowrap"
              title="設定ページへ"
            >
              <FaCog className="w-5 h-5" />
              {displayName} さん
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-[#5a3e28] bg-[#dac7b4] px-3 py-2 rounded-full text-sm shadow-md hover:scale-105 transition"
            title="ログアウト"
          >
            <FaSignOutAlt className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden text-[#5a3e28] text-3xl absolute right-4 top-3"
        >
          {menuOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
        </button>
      </div>

      {menuOpen && (
        <nav className="sm:hidden w-full bg-[#ede3d2] px-4 pb-4 pt-2 shadow-md space-y-3 z-50">
          <div className="max-w-7xl mx-auto space-y-3">
            <button
              type="button"
              onClick={() => {
                navigate('/pomodoro');
                setMenuOpen(false);
              }}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-[#5a3e28] text-[#fffaf3] rounded-full shadow-md border-2 border-[#fffaf3] ring-2 ring-offset-2 ring-[#fffaf3] hover:scale-105 hover:brightness-110 transition text-[3vw] sm:text-base"
            >
              <AiOutlineClockCircle className="w-5 h-5 text-[#fffaf3]" />
              <span className="whitespace-nowrap">学習計測</span>
            </button>

            {isSchoolAdmin && (
              <button
                type="button"
                onClick={() => {
                  navigate('/admin');
                  setMenuOpen(false);
                }}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-[#8f735a] text-[#fffaf3] rounded-full shadow-md"
              >
                <FaUserShield className="w-5 h-5" />
                <span>管理者ページ</span>
              </button>
            )}

            {displayName && (
              <button
                type="button"
                onClick={() => {
                  navigate('/settings');
                  setMenuOpen(false);
                }}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-[#5a3e28] text-[#fffaf3] rounded-full shadow-md border-2 border-[#fffaf3] ring-2 ring-offset-2 ring-[#fffaf3] hover:scale-105 hover:brightness-110 transition text-[3vw] sm:text-base"
              >
                <FaCog className="w-5 h-5 text-[#fffaf3]" />
                <span className="whitespace-nowrap">{displayName} さんの設定</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-[#dac7b4] text-[#5a3e28] rounded-full shadow-md"
            >
              <FaSignOutAlt className="w-5 h-5" />
              <span>ログアウト</span>
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
