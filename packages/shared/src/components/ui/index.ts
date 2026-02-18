/**
 * @shared/components/ui — barrel export
 *
 * Re-exports every cross-platform UI component.
 * 61 components (64 shadcn minus 3 web-only skips) + custom additions.
 */

/* ------------------------------------------------------------------ */
/*  Primitives                                                        */
/* ------------------------------------------------------------------ */
export { Text } from './primitives/Text';
export { View } from './primitives/View';
export { Pressable } from './primitives/Pressable';

/* ------------------------------------------------------------------ */
/*  Core UI Components                                                */
/* ------------------------------------------------------------------ */
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './Accordion';
export { Alert, AlertTitle, AlertDescription } from './Alert';
export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './AlertDialog';
export { AspectRatio } from './AspectRatio';
export { Avatar } from './Avatar';
export { Autocomplete } from './Autocomplete';
export { Badge } from './Badge';
export { BatchFilter } from './BatchFilter';
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from './Breadcrumb';
export { Button } from './Button';
export { Calendar } from './Calendar';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from './Carousel';
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from './Chart';
export { Checkbox } from './Checkbox';
export { CircularProgress } from './CircularProgress';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './Collapsible';
export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
  CommandDialog,
} from './Command';
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuGroup,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuShortcut,
} from './ContextMenu';
export { DateRangeFilter } from './DateRangeFilter';
export { DepartmentFilter } from './DepartmentFilter';
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './Dialog';
export { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription, DrawerClose } from './Drawer';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
} from './DropdownMenu';
export { EmptyState } from './EmptyState';
export { ErrorBoundary } from './ErrorBoundary';
export { ErrorState } from './ErrorState';
export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
} from './Form';
export { HoverCard, HoverCardTrigger, HoverCardContent } from './HoverCard';
export { Input } from './Input';
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from './InputOTP';
export { Label } from './Label';
export { LazyImage } from './LazyImage';
export { PageNotFound } from './PageNotFound';
export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './Pagination';
export { Popover, PopoverTrigger, PopoverContent } from './Popover';
export { Progress } from './Progress';
export { RadioGroup, RadioGroupItem } from './RadioGroup';
export { ScrollArea, ScrollBar } from './ScrollArea';
export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from './Select';
export { Separator } from './Separator';
export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from './Sheet';
export {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from './Sidebar';
export { Skeleton } from './Skeleton';
export { SkeletonText, SkeletonAvatar, SkeletonCard } from './SkeletonLoader';
export { Slider } from './Slider';
export { SurfaceCard } from './SurfaceCard';
export { Switch } from './Switch';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from './Table';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
export { Textarea } from './Textarea';
export { showToast, useToast, Toaster, Sonner } from './Toast';
export { Toggle } from './Toggle';
export { ToggleGroup, ToggleGroupItem } from './ToggleGroup';
export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './Tooltip';
export {
  H1,
  H2,
  H3,
  H4,
  Paragraph,
  Lead,
  Large,
  Small,
  Muted,
  InlineCode,
} from './Typography';
export { UndoSnackbar } from './UndoSnackbar';
export { UserAvatar } from './UserAvatar';
export { UserBadge } from './UserBadge';
