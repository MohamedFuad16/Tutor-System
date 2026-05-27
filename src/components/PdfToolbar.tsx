import React from "react";
import {
  ChevronDown,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
} from "lucide-react";

export const PdfToolbar = () => {
  return (
    <div className="flex items-center bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] p-2 gap-2 relative select-none">
      {/* Ask AI Button */}
      <button
        className="flex items-center gap-1.5 pl-3 pr-4 py-2.5 rounded-[18px] text-white font-semibold text-[15px] transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-[0_4px_14px_rgba(255,59,140,0.3)] hover:shadow-[0_6px_20px_rgba(255,59,140,0.4)] hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #FF3B8C 0%, #FFA07A 100%)",
        }}
      >
        <Sparkles size={18} className="text-white" strokeWidth={2.5} />
        Ask AI
      </button>

      {/* Font Family Dropdown */}
      <button className="flex items-center gap-1.5 px-3 py-2 text-[#3F3F46] hover:bg-[#F4F4F5] rounded-[14px] transition-colors">
        <span className="font-semibold text-[15px] text-[#18181B]">Inter</span>
        <span className="text-[#A1A1AA] mx-0.5">•</span>
        <span className="font-medium text-[15px] text-[#71717A]">Regular</span>
        <ChevronDown
          size={16}
          className="text-[#A1A1AA] ml-1"
          strokeWidth={2.5}
        />
      </button>

      {/* Font Size Dropdown */}
      <button className="flex items-center gap-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] transition-colors rounded-[16px] px-4 py-2 text-[#3F3F46] font-medium text-[15px] h-[42px]">
        14px
        <ChevronDown size={16} className="text-[#A1A1AA]" strokeWidth={2.5} />
      </button>

      <div className="w-px h-6 bg-[#E4E4E7] mx-1" />

      {/* Stroke Width Dropdown */}
      <button className="flex items-center gap-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] transition-colors rounded-[16px] px-4 py-2 text-[#3F3F46] font-medium text-[15px] h-[42px]">
        4px
        <ChevronDown size={16} className="text-[#A1A1AA]" strokeWidth={2.5} />
      </button>

      <div className="w-px h-6 bg-[#E4E4E7] mx-1" />

      {/* Text Formatting Group */}
      <div className="flex items-center gap-1">
        <button className="w-[42px] h-[42px] flex items-center justify-center rounded-[14px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] text-[#18181B] transition-[color,background-color,border-color,box-shadow,transform,opacity]">
          <Bold size={18} strokeWidth={2.5} />
        </button>
        <button className="w-[42px] h-[42px] flex items-center justify-center rounded-[14px] text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] transition-[color,background-color,border-color,box-shadow,transform,opacity]">
          <Italic size={18} strokeWidth={2.5} />
        </button>
        <button className="w-[42px] h-[42px] flex items-center justify-center rounded-[14px] text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] transition-[color,background-color,border-color,box-shadow,transform,opacity]">
          <Underline size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="w-px h-6 bg-[#E4E4E7] mx-1" />

      {/* Alignment Group */}
      <div className="flex items-center bg-[#F4F4F5] rounded-[16px] p-1 gap-1">
        <button className="w-9 h-9 flex items-center justify-center rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.02)] text-[#18181B] transition-[color,background-color,border-color,box-shadow,transform,opacity]">
          <AlignLeft size={16} strokeWidth={2.5} />
        </button>
        <button className="w-9 h-9 flex items-center justify-center rounded-[12px] text-[#71717A] hover:bg-white/50 hover:text-[#18181B] transition-[color,background-color,border-color,box-shadow,transform,opacity]">
          <AlignCenter size={16} strokeWidth={2.5} />
        </button>
        <button className="w-9 h-9 flex items-center justify-center rounded-[12px] text-[#71717A] hover:bg-white/50 hover:text-[#18181B] transition-[color,background-color,border-color,box-shadow,transform,opacity]">
          <AlignRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="w-px h-6 bg-[#E4E4E7] mx-1" />

      {/* Color Picker */}
      <div className="px-1 flex items-center justify-center">
        <button className="w-8 h-8 rounded-full bg-[#5E9EFF] border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(255,255,255,0.4)] transition-transform hover:scale-110 active:scale-95" />
      </div>
    </div>
  );
};
