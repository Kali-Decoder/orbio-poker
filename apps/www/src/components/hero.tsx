import React from 'react';

import Spline from '@splinetool/react-spline/next';

export const Hero = () => {
  return (
    <section className='relative h-[100dvh] w-full overflow-hidden bg-white'>
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='h-full w-full'>
          <Spline
            className='min-h-[100dvh] w-full scale-[130%] sm:scale-[145%] md:scale-[155%]'
            scene='https://prod.spline.design/wgwNW6QZCeRL2mBz/scene.splinecode'
          />
        </div>
      </div>

      {/* Fade Spline’s dark stage into the white page */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0'
        style={{
          background:
            'radial-gradient(ellipse 58% 52% at 50% 48%, transparent 0%, transparent 40%, rgba(255,255,255,0.5) 66%, #ffffff 90%)',
        }}
      />
      <div
        aria-hidden
        className='pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white via-white/85 to-transparent'
      />
      <div
        aria-hidden
        className='pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/80 to-transparent'
      />
    </section>
  );
};
