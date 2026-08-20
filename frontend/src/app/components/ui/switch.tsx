"use client";

import * as React from "react";
import * as SwitchPrimitive from '@radix-ui/react-switch';

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  // Debug logging
  React.useEffect(() => {
    console.log('🎛️ Switch Rendered - checked:', props.checked);
  }, [props.checked]);

  const handleCheckedChange = (newValue: boolean) => {
    console.log('🎛️ Switch Click - Current:', props.checked, '→ New:', newValue);
    if (props.onCheckedChange) {
      props.onCheckedChange(newValue);
    }
  };

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      style={{
        display: 'inline-flex',
        width: '44px',
        height: '24px',
        backgroundColor: props.checked ? '#7c3aed' : '#475569',
        borderRadius: '9999px',
        alignItems: 'center',
        padding: '2px',
        transition: 'background-color 0.2s',
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
      }}
      className={className}
      {...props}
      onCheckedChange={handleCheckedChange}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        style={{
          display: 'block',
          width: '20px',
          height: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '9999px',
          transform: props.checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

