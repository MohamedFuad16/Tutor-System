import React from 'react';

type Status = 'pending' | 'progress' | 'submitted' | 'review' | 'success' | 'failed' | 'expired';

export const StatusBadge = ({ status }: { status: Status }) => {
  const config = {
    pending: { bg: 'bg-[#FDF1E8]', text: 'text-[#D87A2C]', label: 'Pending', icon: <PendingIcon /> },
    progress: { bg: 'bg-[#E7F3FF]', text: 'text-[#0A7DFF]', label: 'In progress', icon: <ProgressIcon /> },
    submitted: { bg: 'bg-[#F1EAFC]', text: 'text-[#6929F4]', label: 'Submitted', icon: <SubmittedIcon /> },
    review: { bg: 'bg-[#FDF4DD]', text: 'text-[#D49B23]', label: 'In review', icon: <ReviewIcon /> },
    success: { bg: 'bg-[#E6F8EA]', text: 'text-[#36AA55]', label: 'Success', icon: <SuccessIcon /> },
    failed: { bg: 'bg-[#FEEDED]', text: 'text-[#EF4C43]', label: 'Failed', icon: <FailedIcon /> },
    expired: { bg: 'bg-[#F3F3F3]', text: 'text-[#6A6A6A]', label: 'Expired', icon: <ExpiredIcon /> },
  };

  const { bg, text, label, icon } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-[14px] text-[17px] font-semibold tracking-tight transition-opacity duration-200 hover:opacity-90 ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
};

// SVG Components matching the vector images

const PendingIcon = () => (
  <div className="relative w-[22px] h-[22px] flex items-center justify-center">
    <svg width="24" height="22" viewBox="0 0 48 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute">
      <path d="M3.7781 29.553L18.0209 6.09945C20.7604 1.58847 27.1738 1.58847 29.9134 6.09945L44.1562 29.553C47.0554 34.3272 43.7013 40.5036 38.2099 40.5036H9.72434C4.23278 40.5036 0.878918 34.3272 3.7781 29.553Z" stroke="currentColor" strokeWidth="5.43245" strokeLinecap="square"/>
    </svg>
    <svg width="3" height="6.5" viewBox="0 0 6 13" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-[6px]">
      <path d="M2.71622 2.71622V9.88313" stroke="currentColor" strokeWidth="5.43245" strokeLinecap="round"/>
    </svg>
    <svg width="3.5" height="3.5" viewBox="0 0 7 7" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-[4px]">
      <path d="M3.30664 3.89707C3.6328 3.89707 3.89707 3.6328 3.89707 3.30664C3.89707 2.98049 3.6328 2.71622 3.30664 2.71622C2.98049 2.71622 2.71622 2.98049 2.71622 3.30664C2.71622 3.6328 2.98049 3.89707 3.30664 3.89707Z" stroke="currentColor" strokeWidth="5.43245" strokeLinecap="square"/>
    </svg>
  </div>
);

const ProgressIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M44.8724 23.6171C44.8724 35.3562 35.3562 44.8724 23.6171 44.8724C11.8781 44.8724 2.36169 35.3562 2.36169 23.6171C2.36169 11.8781 11.8781 2.36169 23.6171 2.36169C35.3562 2.36169 44.8724 11.8781 44.8724 23.6171Z" stroke="currentColor" strokeWidth="4.72342" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7.09 9.45" className="origin-center animate-[spin_3s_linear_infinite]" />
  </svg>
);

const SubmittedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M27.5275 42.4905C28.4996 45.893 33.3102 45.9247 34.3269 42.5351L44.9019 7.28532C45.7125 4.58303 43.193 2.06353 40.4907 2.87421L5.24086 13.4492C1.85152 14.466 1.88317 19.2766 5.28557 20.2486L20.6925 24.6506C21.8694 24.9869 22.7893 25.9068 23.1256 27.0837L27.5275 42.4905Z" stroke="currentColor" strokeWidth="5.43245" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ReviewIcon = () => (
  <div className="relative w-[22px] h-[22px] flex items-center justify-center">
    <svg width="22" height="22" viewBox="0 0 43 43" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute">
      <path d="M2.36197 18.8937C3.52417 9.57362 11.4746 2.36169 21.1094 2.36169C31.5442 2.36169 40.0031 10.8207 40.0031 21.2554C40.0031 30.8904 32.7911 38.8409 23.4709 40.0028" stroke="currentColor" strokeWidth="4.72342" strokeLinecap="round"/>
    </svg>
    <svg width="6" height="6" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-[3px] left-[0px]">
      <path d="M2.36169 2.36169L9.44682 9.44682" stroke="currentColor" strokeWidth="4.72342" strokeLinecap="round"/>
    </svg>
    <svg width="10" height="11" viewBox="0 0 19 21" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-[2px] right-[4px]">
      <path d="M0.286562 12.0175L10.2306 0.416125C10.9924 -0.472586 12.4441 0.169564 12.2989 1.33105L11.6051 6.88178H17.3037C18.3126 6.88178 18.8567 8.06523 18.2002 8.83113L8.25615 20.4326C7.49433 21.3213 6.04266 20.6791 6.18786 19.5176L6.88168 13.9669H1.18314C0.174263 13.9669 -0.369993 12.7835 0.286562 12.0175Z" fill="currentColor"/>
    </svg>
  </div>
);

const SuccessIcon = () => (
  <div className="relative w-[22px] h-[22px] flex items-center justify-center">
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute">
      <path d="M45.227 23.9716C45.227 35.7107 35.7107 45.227 23.9716 45.227C12.2326 45.227 2.71625 35.7107 2.71625 23.9716C2.71625 12.2326 12.2326 2.71625 23.9716 2.71625C35.7107 2.71625 45.227 12.2326 45.227 23.9716Z" stroke="currentColor" strokeWidth="5.43245" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <svg width="11" height="10" viewBox="0 0 21 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-[7px]">
      <path d="M18.0674 2.71631L7.43967 15.7057L2.71625 10.9823" stroke="currentColor" strokeWidth="5.43245" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const FailedIcon = () => (
  <div className="relative w-[22px] h-[22px] flex items-center justify-center">
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute">
      <path d="M45.227 23.9716C45.227 35.7107 35.7107 45.227 23.9716 45.227C12.2326 45.227 2.71622 35.7107 2.71622 23.9716C2.71622 12.2326 12.2326 2.71625 23.9716 2.71625C35.7107 2.71625 45.227 12.2326 45.227 23.9716Z" stroke="currentColor" strokeWidth="5.43245" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <svg width="11" height="11" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute">
      <path d="M2.71622 2.71625L17.465 17.465M17.465 2.71625L2.71622 17.465" stroke="currentColor" strokeWidth="5.43245" strokeLinecap="round"/>
    </svg>
  </div>
);

const ExpiredIcon = () => (
  <svg width="22" height="22" viewBox="0 0 55 55" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M27.1623 16.2974V27.1623L33.9528 33.9528M51.6083 27.1623C51.6083 40.6636 40.6636 51.6083 27.1623 51.6083C13.6611 51.6083 2.71625 40.6636 2.71625 27.1623C2.71625 13.6611 13.6611 2.71625 27.1623 2.71625C40.6636 2.71625 51.6083 13.6611 51.6083 27.1623Z" stroke="currentColor" strokeWidth="5.43245" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
