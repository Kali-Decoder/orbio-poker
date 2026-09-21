'use client';

import React, { useEffect, useState } from 'react';

import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';

const TWITTER_URL = 'https://x.com/Orbio_casino';
const STORAGE_KEY = 'orbio-twitter-follow-dismissed';

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      aria-hidden
      className={className}
      fill='currentColor'
    >
      <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
    </svg>
  );
}

export function FollowTwitterModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // ignore storage errors
    }

    const id = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setOpen(false);
  };

  const onOpenChange = (next: boolean) => {
    if (!next) dismiss();
    else setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md rounded-3xl border-neutral-200 bg-white p-6'>
        <DialogHeader className='sm:text-center'>
          <div className='mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-950 text-white'>
            <XIcon className='h-5 w-5' />
          </div>
          <DialogTitle className='font-poker text-2xl tracking-wide text-neutral-950'>
            Follow Orbio Casino
          </DialogTitle>
          <DialogDescription className='text-neutral-600'>
            Stay in the loop on drops, tables, and announcements. Follow us on X
            for the latest from Orbio Casino.
          </DialogDescription>
        </DialogHeader>

        <div className='mt-2 flex flex-col gap-2'>
          <Button
            asChild
            className='h-11 w-full rounded-full bg-neutral-950 text-white hover:bg-neutral-800'
          >
            <a
              href={TWITTER_URL}
              target='_blank'
              rel='noopener noreferrer'
              onClick={dismiss}
            >
              <XIcon className='mr-2 h-4 w-4' />
              Follow @Orbio_casino
            </a>
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-11 w-full rounded-full bg-white'
            onClick={dismiss}
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
