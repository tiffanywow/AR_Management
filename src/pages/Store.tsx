import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Package, ShoppingCart, Tag, Edit, Trash2, Eye, AlertCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  weight: number | null;
  dimensions: any;
  delivery_fee: number;
  images: any[];
  tags: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  store_categories?: { name: string };
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  payment_status: string;
  subtotal: number;
  delivery_total: number;
  tax_total: number;
  total: number;
  currency: string;
  payment_method: string | null;
  delivery_address: any;
  delivery_phone: string;
  created_at: string;
  profiles?: { full_name: string };
}

export default function Store() {
  const [activeTab, setActiveTab] = useState('products');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('store_categories')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error('Error loading categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select(`
          *,
          store_categories (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error('Error loading products: ' + error.message);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('store_orders')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error('Error loading orders: ' + error.message);
    }
  };

  const handleSaveCategory = async (formData: FormData) => {
    const categoryData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      slug: (formData.get('name') as string).toLowerCase().replace(/\s+/g, '-'),
      display_order: parseInt(formData.get('display_order') as string) || 0,
      is_active: formData.get('is_active') === 'on',
    };

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('store_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase
          .from('store_categories')
          .insert(categoryData);

        if (error) throw error;
        toast.success('Category created successfully');
      }

      fetchCategories();
      setShowCategoryDialog(false);
      setEditingCategory(null);
    } catch (error: any) {
      toast.error('Error saving category: ' + error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('store_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error: any) {
      toast.error('Error deleting category: ' + error.message);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('store-products')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('store-products')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setUploadedImages(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error: any) {
      toast.error('Error uploading images: ' + error.message);
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (url: string) => {
    setUploadedImages(prev => prev.filter(img => img !== url));
  };

  const handleSaveProduct = async (formData: FormData) => {
    const categoryId = formData.get('category_id') as string;
    const productData = {
      category_id: categoryId === 'none' ? null : categoryId,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      short_description: formData.get('short_description') as string,
      price: parseFloat(formData.get('price') as string),
      compare_at_price: formData.get('compare_at_price') ? parseFloat(formData.get('compare_at_price') as string) : null,
      cost_price: formData.get('cost_price') ? parseFloat(formData.get('cost_price') as string) : null,
      sku: formData.get('sku') as string,
      stock_quantity: parseInt(formData.get('stock_quantity') as string) || 0,
      low_stock_threshold: parseInt(formData.get('low_stock_threshold') as string) || 5,
      delivery_fee: parseFloat(formData.get('delivery_fee') as string) || 0,
      is_active: formData.get('is_active') === 'on',
      is_featured: formData.get('is_featured') === 'on',
      images: uploadedImages,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('store_products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('store_products')
          .insert(productData);

        if (error) throw error;
        toast.success('Product created successfully');
      }

      fetchProducts();
      setShowProductDialog(false);
      setEditingProduct(null);
      setUploadedImages([]);
    } catch (error: any) {
      toast.error('Error saving product: ' + error.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error: any) {
      toast.error('Error deleting product: ' + error.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('store_orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order status updated');
      fetchOrders();
    } catch (error: any) {
      toast.error('Error updating order: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      processing: 'secondary',
      shipped: 'default',
      delivered: 'default',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-lg">Loading store...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-medium text-gray-900">Store Management</h1>
          <p className="text-sm text-gray-500 font-light">Manage products, categories, and orders</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium text-gray-900">Products</h2>
            <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingProduct(null);
                  setUploadedImages([]);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-medium text-gray-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 font-light">
                    {editingProduct ? 'Update product information' : 'Create a new product'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (uploadedImages.length === 0 && !editingProduct) {
                    toast.error('Please upload at least one product image');
                    return;
                  }
                  handleSaveProduct(new FormData(e.currentTarget));
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input id="name" name="name" defaultValue={editingProduct?.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category_id">Category</Label>
                      <Select name="category_id" defaultValue={editingProduct?.category_id || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Category</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="short_description">Short Description</Label>
                    <Input id="short_description" name="short_description" defaultValue={editingProduct?.short_description || ''} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Full Description</Label>
                    <Textarea id="description" name="description" rows={4} defaultValue={editingProduct?.description || ''} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (NAD) *</Label>
                      <Input id="price" name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="compare_at_price">Compare Price</Label>
                      <Input id="compare_at_price" name="compare_at_price" type="number" step="0.01" defaultValue={editingProduct?.compare_at_price || ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost_price">Cost Price</Label>
                      <Input id="cost_price" name="cost_price" type="number" step="0.01" defaultValue={editingProduct?.cost_price || ''} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU *</Label>
                      <Input id="sku" name="sku" defaultValue={editingProduct?.sku || ''} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Stock Quantity</Label>
                      <Input id="stock_quantity" name="stock_quantity" type="number" defaultValue={editingProduct?.stock_quantity} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="low_stock_threshold">Low Stock Alert</Label>
                      <Input id="low_stock_threshold" name="low_stock_threshold" type="number" defaultValue={editingProduct?.low_stock_threshold} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery_fee">Delivery Fee (NAD)</Label>
                    <Input id="delivery_fee" name="delivery_fee" type="number" step="0.01" defaultValue={editingProduct?.delivery_fee} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product_images">Product Images {!editingProduct && '*'}</Label>
                    <Input
                      id="product_images"
                      type="file"
                      accept="image/*"
                      multiple
                      ref={fileInputRef}
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                      disabled={uploadingImages}
                    />
                    {uploadingImages && (
                      <p className="text-sm text-gray-500">Uploading images...</p>
                    )}
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {uploadedImages.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img src={url} alt={`Product ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(url)}
                              className="absolute top-1 right-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {editingProduct?.images && editingProduct.images.length > 0 && uploadedImages.length === 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {editingProduct.images.map((url: string, idx: number) => (
                          <img key={idx} src={url} alt={`Product ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch id="is_active" name="is_active" defaultChecked={editingProduct?.is_active !== false} />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="is_featured" name="is_featured" defaultChecked={editingProduct?.is_featured} />
                      <Label htmlFor="is_featured">Featured</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowProductDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription>
                        {product.store_categories?.name || 'No category'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {!product.is_active && <Badge variant="secondary">Inactive</Badge>}
                      {product.is_featured && <Badge>Featured</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Price:</span>
                      <span className="font-semibold">N$ {product.price.toFixed(2)}</span>
                    </div>
                    {product.compare_at_price && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Compare at:</span>
                        <span className="line-through text-sm">N$ {product.compare_at_price.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Stock:</span>
                      <span className={product.stock_quantity <= product.low_stock_threshold ? 'text-red-600 font-semibold' : ''}>
                        {product.stock_quantity} {product.stock_quantity <= product.low_stock_threshold && <AlertCircle className="inline h-4 w-4" />}
                      </span>
                    </div>
                    {product.sku && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">SKU:</span>
                        <span className="text-sm">{product.sku}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEditingProduct(product);
                          setUploadedImages(product.images || []);
                          setShowProductDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-gray-100 hover:bg-gray-200"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium text-gray-900">Categories</h2>
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingCategory(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-lg font-medium text-gray-900">{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 font-light">
                    {editingCategory ? 'Update category information' : 'Create a new product category'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveCategory(new FormData(e.currentTarget));
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Category Name *</Label>
                    <Input id="cat-name" name="name" defaultValue={editingCategory?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-description">Description</Label>
                    <Textarea id="cat-description" name="description" defaultValue={editingCategory?.description || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input id="display_order" name="display_order" type="number" defaultValue={editingCategory?.display_order || 0} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="cat-is_active" name="is_active" defaultChecked={editingCategory?.is_active !== false} />
                    <Label htmlFor="cat-is_active">Active</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingCategory ? 'Update Category' : 'Create Category'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{category.name}</CardTitle>
                      <CardDescription>{category.description || 'No description'}</CardDescription>
                    </div>
                    {!category.is_active && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Display Order:</span>
                      <span>{category.display_order}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Products:</span>
                      <span>{products.filter(p => p.category_id === category.id).length}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEditingCategory(category);
                          setShowCategoryDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-gray-100 hover:bg-gray-200"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <h2 className="text-xl font-medium text-gray-900">Orders</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.profiles?.full_name || 'Unknown'}</TableCell>
                      <TableCell>{order.currency} {order.total.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{getStatusBadge(order.payment_status)}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
