import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, beforeEach, afterEach, test, expect } from 'vitest';
const { invoke, toast } = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ isSupabaseConfigured: true, supabase: { functions: { invoke } } }));
vi.mock('@/hooks/use-toast', () => ({ toast }));
vi.mock('@/components/ui/select', () => ({
 Select: ({ value, onValueChange, children }: any) => <select aria-label="Service type" value={value} onChange={e => onValueChange(e.target.value)}>{children}</select>,
 SelectTrigger: () => null, SelectValue: () => null,
 SelectContent: ({ children }: any) => <>{children}</>,
 SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));
import ContactForm from '@/components/ContactForm';
beforeEach(() => { invoke.mockReset(); toast.mockReset(); });
afterEach(cleanup);
function fill() {
 render(<ContactForm />);
 for (const [label, value] of [['Full name *','Test Person'],['Email *','test@example.com'],['Phone *','6045550123'],['Postal code *','V6B 1A1'],['Service address *','123 Test Street']]) fireEvent.change(screen.getByLabelText(label), {target:{value}});
 fireEvent.change(screen.getByLabelText('Service type'), {target:{value:'commercial-plowing'}});
}
for (const [name,response] of Object.entries({ empty:{data:null,error:null}, unconfirmed:{data:{},error:null}, network:{data:null,error:new Error('offline')}, rejected:{data:{success:false,code:'insert_error'},error:null} })) {
 test(`${name} response preserves enquiry and never announces success`, async () => {
  invoke.mockResolvedValue(response); fill(); fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(invoke).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getByRole('button',{name:'Request Free Quote'})).toBeEnabled());
  expect(screen.getByLabelText('Full name *')).toHaveValue('Test Person');
  expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({title:'Quote request sent!'}));
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({variant:'destructive'}));
 });
}
test('confirmed server acceptance clears the enquiry',async()=>{
 invoke.mockResolvedValue({data:{success:true,code:'ok'},error:null}); fill(); fireEvent.submit(screen.getByRole('form'));
 await waitFor(()=>expect(screen.getByLabelText('Full name *')).toHaveValue(''));
 expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Quote request sent!'}));
});
test('invalid enquiry stays local and exposes accessible field errors',async()=>{
 render(<ContactForm/>); fireEvent.submit(screen.getByRole('form'));
 expect(invoke).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Full name *')).toHaveAttribute('aria-describedby','name-error');
 await waitFor(()=>expect(screen.getByLabelText('Full name *')).toHaveFocus());
});
