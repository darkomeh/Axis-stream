import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Settings as SettingsIcon, Play, Smartphone, Palette, Download, Bell, User, Heart, Zap, Globe, Shield, Accessibility, Trophy, Smile } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { motion } from "motion/react";

export default function Settings() {
  const navigate = useNavigate();
  const { preferences, updatePreferences } = useAuth();
  const { showToast } = useToast();

  const handleBack = () => {
    navigate(-1);
  };

  const updatePref = (key: string, value: any) => {
    updatePreferences({ [key]: value });
  };

  // Define settings schema
  const settingsSections = [
    {
      id: "playback",
      title: "Playback",
      icon: Play,
      items: [
        { label: "Auto Play Next Episode", key: "autoPlayNext", type: "toggle" },
        { label: "Auto Skip Intro", key: "skipIntro", type: "toggle" },
        { label: "Auto Skip Credits", key: "skipCredits", type: "toggle" },
        { label: "Resume Playback Automatically", key: "resumePlayback", type: "toggle", defaultVal: true },
        { label: "Remember Playback Position", key: "rememberPosition", type: "toggle", defaultVal: true },
        { label: "Default Video Quality", key: "defaultQuality", type: "select", options: ["Auto", "4K", "1080p", "720p"] },
        { label: "Playback Speed Preference", key: "playbackSpeed", type: "select", options: ["0.5x", "1x", "1.25x", "1.5x", "2x"] },
      ]
    },
    {
      id: "experience",
      title: "App Experience",
      icon: Smartphone,
      items: [
        { label: "Enable Trailers on Hover", key: "showTrailers", type: "toggle" },
        { label: "Reduce Animations", key: "reduceAnimations", type: "toggle" },
        { label: "Compact Mode", key: "compactMode", type: "toggle" },
        { label: "Show IMDb Ratings", key: "showRatings", type: "toggle", defaultVal: true },
        { label: "Enable Sound Effects", key: "soundEffects", type: "toggle" },
      ]
    },
    {
      id: "parental",
      title: "Kids & Family",
      icon: Smile,
      items: [
        { label: "Enable Kids Mode (Cartoons Only)", key: "kidsMode", type: "toggle", defaultVal: false },
      ]
    },
    {
      id: "appearance",
      title: "Appearance",
      icon: Palette,
      items: [
        { label: "Theme", key: "theme", type: "select", options: ["Dark", "Midnight Black", "OLED Black", "System"] },
        { label: "Accent Color", key: "accentColor", type: "select", options: ["Red", "Blue", "Purple", "Orange", "Green", "Gold"] },
      ]
    },
    {
      id: "downloads",
      title: "Downloads",
      icon: Download,
      items: [
        { label: "Download Quality", key: "downloadQuality", type: "select", options: ["Standard", "High", "Maximum"] },
        { label: "Download Only on Wi-Fi", key: "wifiOnly", type: "toggle", defaultVal: true },
        { label: "Smart Downloads", key: "smartDownloads", type: "toggle", defaultVal: true },
        { label: "Auto Delete Watched Downloads", key: "autoDelete", type: "toggle" },
      ]
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Bell,
      items: [
        { label: "New Releases", key: "notifyNewReleases", type: "toggle", defaultVal: true },
        { label: "Watchlist Updates", key: "notifyWatchlist", type: "toggle", defaultVal: true },
        { label: "Promotional Notifications", key: "notifyPromo", type: "toggle", defaultVal: false },
      ]
    },
    {
      id: "performance",
      title: "Performance",
      icon: Zap,
      items: [
        { label: "Data Saver", key: "dataSaver", type: "toggle", defaultVal: false },
        { label: "Hardware Acceleration", key: "hardwareAccel", type: "toggle", defaultVal: true },
        { label: "Preload Next Episode", key: "preloadNext", type: "toggle", defaultVal: true },
      ]
    },
    {
      id: "privacy",
      title: "Privacy & Security",
      icon: Shield,
      items: [
        { label: "Hide Watch History", key: "hideHistory", type: "toggle" },
        { label: "Anonymous Analytics", key: "analytics", type: "toggle", defaultVal: true },
        { label: "Change Password", key: "changePassword", type: "action" },
        { label: "Two-Factor Authentication", key: "2fa", type: "action" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24 overflow-x-hidden pt-24 font-sans selection:bg-brand/30">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-brand/5 to-black" />

      {/* Custom Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-3xl bg-black/40 border-b border-white/5">
        <button
          onClick={handleBack}
          className="flex items-center gap-3 transition-colors group"
        >
          <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Settings
          </h1>
        </button>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 space-y-8 pb-12">
        {settingsSections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/[0.03] backdrop-blur-[30px] border border-white/10 rounded-3xl p-5 sm:p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
                <h3 className="text-lg font-bold tracking-wide text-white">
                  {section.title}
                </h3>
              </div>

              <div className="space-y-4">
                {section.items.map((item, i) => {
                  const currentValue = (preferences as any)[item.key] ?? (item as any).defaultVal ?? (item.type === 'toggle' ? false : "Auto");
                  
                  return (
                    <div key={item.key}>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-200">
                          {item.label}
                        </span>
                        
                        {item.type === "toggle" && (
                          <button
                            onClick={() => updatePref(item.key, !currentValue)}
                            className={`relative w-[50px] h-7 rounded-full transition-colors duration-300 ${
                              currentValue ? "bg-brand" : "bg-white/10"
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                                currentValue ? "translate-x-[22px]" : "translate-x-0"
                              }`}
                            />
                          </button>
                        )}

                        {item.type === "select" && (
                          <select
                            value={currentValue}
                            onChange={(e) => updatePref(item.key, e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-medium text-white outline-none focus:border-brand/50"
                          >
                            {(item as any).options.map((opt: string) => (
                              <option key={opt} value={opt} className="bg-black">{opt}</option>
                            ))}
                          </select>
                        )}
                        {item.type === "action" && (
                          <button
                            onClick={() => {
                              if (item.key === "changePassword") {
                                showToast("Password reset email sent to your registered address.", "success");
                              } else if (item.key === "2fa") {
                                showToast("Two-Factor Authentication setup instructions sent.", "info");
                              }
                            }}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-colors"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                      {i < section.items.length - 1 && <div className="h-px w-full bg-white/5 mt-2" />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center pt-4"
        >
          <button
            onClick={() => {
              import("../contexts/AuthContext").then(m => {
                updatePreferences(m.defaultPreferences);
                showToast("Settings restored to defaults", "success");
              });
            }}
            className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold tracking-wide transition-colors border border-red-500/20 flex items-center gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            Restore Defaults
          </button>
        </motion.div>
      </div>
    </div>
  );
}
