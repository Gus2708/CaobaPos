# Historial (History Panel) Fixes

## Summary
Fixed critical synchronization issues in the history panel where deleted sales were not being removed from the list and the view wasn't syncing with the database.

## Issues Fixed

### 1. **Query Key Serialization Issue**
- **Problem**: The query key was using the entire `dateRange` object: `['sales-history', selectedMethod, period, dateRange]`
- **Issue**: Objects don't serialize properly in React Query's cache, causing query invalidation to fail
- **Fix**: Split into individual properties: `['sales-history', selectedMethod, period, dateRange.start, dateRange.end]`
- **Location**: Lines 196, 235

### 2. **Cache Invalidation Not Working**
- **Problem**: Used `setQueriesData` with partial key matching that didn't correctly target the query
- **Issue**: Manual cache updates weren't matching the actual query structure, and invalidation wasn't causing refetch
- **Fix**: 
  - Removed manual cache update (it was unreliable)
  - Added explicit `exact: false` to invalidation for proper prefix matching
  - Added immediate `refetch()` after invalidation to force fresh data
- **Location**: Lines 311-345

### 3. **Missing Total Sum Query Invalidation**
- **Problem**: When deleting a sale, the total sum wasn't being recalculated
- **Fix**: Added invalidation for `['sales-history-total']` query
- **Location**: Line 323-326

### 4. **Incomplete Sale Details Fetching**
- **Problem**: When viewing a sale, `client_id` wasn't always available, causing issues with credit sale cleanup
- **Fix**: Fetch complete sale record from database before showing details
- **Location**: Lines 449-468

### 5. **Missing Error Logging**
- **Problem**: Errors in delete operations weren't being logged, making debugging difficult
- **Fix**: Added detailed console error logs at each step
- **Location**: Lines 264-302

### 6. **Async Flow Issues in Update Mutation**
- **Problem**: Update mutation also had incomplete cache invalidation
- **Fix**: Applied same fixes as delete mutation (await invalidation, call refetch)
- **Location**: Lines 410-431

## Changes Made

### File: `app/HistoryPanel.tsx`

**Change 1: Query Key Structure (Lines 196, 235)**
```typescript
// Before
queryKey: ['sales-history', selectedMethod, period, dateRange]
queryKey: ['sales-history-total', selectedMethod, period, dateRange]

// After
queryKey: ['sales-history', selectedMethod, period, dateRange.start, dateRange.end]
queryKey: ['sales-history-total', selectedMethod, period, dateRange.start, dateRange.end]
```

**Change 2: Delete Mutation Success Handler (Lines 311-345)**
```typescript
// Before: Used setQueriesData then invalidateQueries separately
// After: 
// - Close modal immediately
// - Invalidate with explicit exact: false
// - Call refetch() to trigger immediate update
onSuccess: async (_, deletedSale) => {
  setShowDetail(false);
  setSelectedSale(null);

  await queryClient.invalidateQueries({
    queryKey: ['sales-history'],
    exact: false
  });

  await queryClient.invalidateQueries({
    queryKey: ['sales-history-total'],
    exact: false
  });

  // ... other invalidations ...

  refetch();
  showToast('Venta eliminada y stock restaurado', 'success');
}
```

**Change 3: Enhanced Error Logging (Lines 264-302)**
Added console.error logs for:
- Fetching sale items
- Restoring stock
- Deleting payments
- Deleting sale

**Change 4: Complete Sale Details Fetch (Lines 449-468)**
```typescript
// Before: Used sale from list (might be incomplete)
// After: Fetch full sale record first
const handleView = useCallback(async (sale: Sale) => {
  try {
    const { data: fullSale, error: saleError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', sale.id)
      .single();
    
    if (saleError) throw saleError;
    
    const { data: items, error: itemsError } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale.id);
    
    if (itemsError) throw itemsError;
    
    setSelectedSale({ ...fullSale, sale_items: items ?? [] });
    setShowDetail(true);
  } catch (error) {
    console.error('Error loading sale details:', error);
    showToast('No se pudieron cargar los detalles', 'error');
  }
}, [showToast]);
```

**Change 5: Update Mutation (Lines 410-431)**
Applied same invalidation pattern as delete mutation.

## Testing
✅ All existing tests pass: `npm test -- __tests__/HistoryFiltering.test.tsx`

## How It Works Now

1. **When you delete a sale:**
   - Delete confirmed → Immediately closes detail modal
   - Database delete executes with stock restoration
   - All affected query caches are invalidated
   - Fresh data is fetched from database
   - List updates instantly with correct data

2. **When you update a sale:**
   - Same flow as delete for proper sync
   - Inventory and client balances are updated

3. **Date/Filter changes:**
   - Proper queryKey structure ensures cache is correctly tagged
   - Filtering now works correctly with date ranges

## Debugging
If issues persist, check console logs for:
- "Delete mutation error:" - Database issues
- "Error fetching sale items:" - Stock restoration issues  
- "Error deleting sale:" - Database delete failed
- "Error loading sale details:" - Failed to fetch complete sale data

All error messages now include the actual error details from Supabase.
