# 08 — Forms & Validation

## Stack

- **React Hook Form** — form state, submission handling
- **Zod** — schema validation (same schema used in Server Action)
- **@hookform/resolvers/zod** — connects the two
- **Shadcn Form components** — consistent styling

---

## Standard Form Pattern

Define the Zod schema once and use it in both the form and the Server Action.

```tsx
// client/components/forms/create-bot-form.tsx
'use client'
import { useForm }        from 'react-hook-form'
import { zodResolver }    from '@hookform/resolvers/zod'
import { z }              from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBot }      from '@/app/actions/bots'
import { toast }          from 'sonner'
import { Button }         from '@/components/ui/button'
import { Input }          from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

// ─── Schema ─────────────────────────────────────────────────────
const createBotSchema = z.object({
  name:              z.string().min(1, 'Name is required').max(50),
  exchangeId:        z.string().min(1, 'Select an exchange'),
  tradeType:         z.enum(['SPOT', 'MARGIN']),
  pairs:             z.string().min(1, 'Enter at least one pair'),  // Comma-separated input
  tradeAmountUsdt:   z.coerce.number().positive().min(10, 'Minimum $10'),
  leverage:          z.coerce.number().int().min(1).max(20).default(1),
  stopLossPercent:   z.coerce.number().min(0.1).max(50).optional(),
  takeProfitPercent: z.coerce.number().min(0.1).max(500).optional(),
})

type FormValues = z.infer<typeof createBotSchema>

// ─── Component ──────────────────────────────────────────────────
export function CreateBotForm({ exchanges, onSuccess }: {
  exchanges: { id: string; label: string }[]
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(createBotSchema),
    defaultValues: {
      tradeType: 'SPOT',
      leverage:  1,
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      // Transform pairs string → array before sending to Server Action
      return createBot({
        ...values,
        pairs: values.pairs.split(',').map(p => p.trim().toUpperCase()),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      toast.success('Bot created successfully!')
      form.reset()
      onSuccess()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const tradeType = form.watch('tradeType')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(v => mutate(v))} className="space-y-4">

        {/* Name */}
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Bot Name</FormLabel>
            <FormControl><Input placeholder="My BTCUSDT Bot" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Exchange */}
        <FormField control={form.control} name="exchangeId" render={({ field }) => (
          <FormItem>
            <FormLabel>Exchange</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select exchange" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {exchanges.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Trade Type */}
        <FormField control={form.control} name="tradeType" render={({ field }) => (
          <FormItem>
            <FormLabel>Trade Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="SPOT">Spot</SelectItem>
                <SelectItem value="MARGIN">Margin</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Pairs */}
        <FormField control={form.control} name="pairs" render={({ field }) => (
          <FormItem>
            <FormLabel>Trading Pairs</FormLabel>
            <FormControl>
              <Input placeholder="BTCUSDT, ETHUSDT" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Amount */}
        <FormField control={form.control} name="tradeAmountUsdt" render={({ field }) => (
          <FormItem>
            <FormLabel>Trade Amount (USDT)</FormLabel>
            <FormControl><Input type="number" placeholder="100" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Leverage — only show for MARGIN */}
        {tradeType === 'MARGIN' && (
          <FormField control={form.control} name="leverage" render={({ field }) => (
            <FormItem>
              <FormLabel>Leverage</FormLabel>
              <FormControl><Input type="number" min={1} max={20} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {/* SL / TP */}
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="stopLossPercent" render={({ field }) => (
            <FormItem>
              <FormLabel>Stop Loss %</FormLabel>
              <FormControl><Input type="number" placeholder="2" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="takeProfitPercent" render={({ field }) => (
            <FormItem>
              <FormLabel>Take Profit %</FormLabel>
              <FormControl><Input type="number" placeholder="4" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Creating...' : 'Create Bot'}
        </Button>
      </form>
    </Form>
  )
}
```

---

## Exchange API Key Form

```tsx
// client/components/forms/exchange-form.tsx
'use client'
import { useState } from 'react'
import { useForm }  from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'

const exchangeSchema = z.object({
  label:     z.string().min(1).max(50),
  apiKey:    z.string().min(10, 'Invalid API key'),
  apiSecret: z.string().min(10, 'Invalid secret'),
})

export function ExchangeForm({ onSuccess }: { onSuccess: () => void }) {
  const [showSecret, setShowSecret] = useState(false)
  const form = useForm({ resolver: zodResolver(exchangeSchema) })

  // ... form fields
  // ⚠️ apiKey and apiSecret fields — never log or display after submit
  // The Server Action encrypts them before hitting DB
}
```

---

## Validation Rules Reference

```typescript
// Zod schemas for all major forms

// Bot
z.object({
  name:              z.string().min(1).max(50),
  tradeType:         z.enum(['SPOT', 'MARGIN']),
  pairs:             z.array(z.string().min(1)).min(1),
  tradeAmountUsdt:   z.number().positive().min(10),
  leverage:          z.number().int().min(1).max(20),
  stopLossPercent:   z.number().min(0.1).max(50).optional(),
  takeProfitPercent: z.number().min(0.1).max(500).optional(),
})

// Exchange
z.object({
  label:     z.string().min(1).max(50),
  apiKey:    z.string().min(10),
  apiSecret: z.string().min(10),
})

// Manual trade (terminal)
z.object({
  symbol:   z.string().min(1),
  side:     z.enum(['LONG', 'SHORT']),
  type:     z.enum(['SPOT', 'MARGIN']),
  amount:   z.number().positive(),
  leverage: z.number().int().min(1).max(20).optional(),
})
```
