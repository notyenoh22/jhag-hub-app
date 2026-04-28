import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { addIcons } from 'ionicons';
import {
  cartOutline, searchOutline, personOutline, logOutOutline,
  homeOutline, bagOutline, heartOutline, star, starHalf, starOutline,
  closeOutline, checkmarkCircleOutline, cubeOutline,
  mailOutline, calendarOutline, trashOutline, addOutline, removeOutline
} from 'ionicons/icons';

// Auth Service (localStorage for user management)
class AuthService {
  private currentUserKey = 'jhag_current_user';
  private usersKey = 'jhag_users';

  constructor() {
    if (!localStorage.getItem(this.usersKey)) {
      localStorage.setItem(this.usersKey, JSON.stringify([
        { email: 'customer@jhag.com', password: '123456', name: 'Maria Santos' }
      ]));
    }
  }

  getCurrentUser(): any {
    const user = localStorage.getItem(this.currentUserKey);
    return user ? JSON.parse(user) : null;
  }

  login(email: string, password: string): boolean {
    const users = JSON.parse(localStorage.getItem(this.usersKey) || '[]');
    const user = users.find((u: any) => u.email === email && u.password === password);
    if (user) {
      localStorage.setItem(this.currentUserKey, JSON.stringify({ name: user.name, email: user.email }));
      return true;
    }
    return false;
  }

  signup(name: string, email: string, password: string): boolean {
    const users = JSON.parse(localStorage.getItem(this.usersKey) || '[]');
    if (users.find((u: any) => u.email === email)) return false;
    users.push({ name, email, password });
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    localStorage.setItem(this.currentUserKey, JSON.stringify({ name, email }));
    return true;
  }

  logout(): void {
    localStorage.removeItem(this.currentUserKey);
  }
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule]
})
export class HomePage implements OnInit {
  activeTab = 'products';
  showSearchBar = false;
  searchQuery = '';
  filteredProducts: any[] = [];

  products: any[] = [];
  cart: any[] = [];
  cartTotal = 0;

  currentUser: any = null;
  showAuthModal = false;
  authMode: 'login' | 'signup' = 'login';
  authEmail = '';
  authPassword = '';
  authName = '';
  authMessage = '';

  private apiUrl = 'https://jhag-hub-backend-1.onrender.com';
  private authService = new AuthService();

  constructor(private http: HttpClient) {
    addIcons({
      cartOutline, searchOutline, personOutline, logOutOutline,
      homeOutline, bagOutline, heartOutline, star, starHalf, starOutline,
      closeOutline, checkmarkCircleOutline, cubeOutline,
      mailOutline, calendarOutline, trashOutline, addOutline, removeOutline
    });
  }

  ngOnInit() {
    this.loadUser();
    this.fetchProducts();
    this.fetchCart();
  }

  loadUser() {
    this.currentUser = this.authService.getCurrentUser();
  }

  // Fetch products from API - NO HARDCODED DATA
  fetchProducts() {
    this.http.get(`${this.apiUrl}/products`).subscribe({
      next: (res: any) => {
        if (res.success && res.products) {
          this.products = res.products;
          this.filteredProducts = [...this.products];
          console.log('✅ Products loaded from API:', this.products.length);
        } else {
          console.error('Unexpected API response:', res);
          this.showToast('Failed to load products');
        }
      },
      error: (err) => {
        console.error('❌ Fetch products error:', err);
        this.showToast('Cannot connect to backend. Make sure server is running on port 3000');
      }
    });
  }

  // Fetch cart from API
  fetchCart() {
    this.http.get(`${this.apiUrl}/cart`).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.cart = res.cart;
          this.cartTotal = res.total;
        }
      },
      error: (err) => console.error('Fetch cart error:', err)
    });
  }

  // Add to cart - sends POST request to backend
  addToCart(product: any) {
    if (!this.currentUser) {
      this.openAuthModal('login');
      this.authMessage = 'Please login first';
      return;
    }

    const payload = { productId: product.id, quantity: 1 };

    this.http.post(`${this.apiUrl}/cart`, payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.cart = res.cart;
          this.cartTotal = res.total;
          this.showToast(`${product.name} added to cart`);
        } else {
          this.showToast(res.message || 'Failed to add item');
        }
      },
      error: (err) => {
        console.error('Add to cart error:', err);
        if (err.status === 0) {
          this.showToast('Cannot connect to backend. Is server running?');
        } else if (err.status === 404) {
          this.showToast('API endpoint not found');
        } else {
          this.showToast('Failed to add item');
        }
      }
    });
  }

  // Update cart item quantity
  updateCartQuantity(item: any, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.http.delete(`${this.apiUrl}/cart/${item.id}`).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.cart = res.cart;
            this.cartTotal = res.total;
          }
        },
        error: (err) => console.error('Remove item error:', err)
      });
    } else {
      this.http.put(`${this.apiUrl}/cart/${item.id}`, { quantity: newQty }).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.cart = res.cart;
            this.cartTotal = res.total;
          }
        },
        error: (err) => console.error('Update quantity error:', err)
      });
    }
  }

  // Remove item from cart
  removeCartItem(itemId: number) {
    this.http.delete(`${this.apiUrl}/cart/${itemId}`).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.cart = res.cart;
          this.cartTotal = res.total;
        }
      },
      error: (err) => console.error('Remove item error:', err)
    });
  }

  // Checkout - place order
  checkout() {
    if (this.cart.length === 0) {
      this.showToast('Cart is empty');
      return;
    }
    this.http.post(`${this.apiUrl}/orders`, {
      customerName: this.currentUser?.name || 'Guest',
      address: 'Customer Address',
      paymentMethod: 'COD',
      total: this.cartTotal
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showToast(`Order placed! Total ₱${this.cartTotal}`);
          this.cart = [];
          this.cartTotal = 0;
          this.activeTab = 'products';
        } else {
          this.showToast(res.message || 'Checkout failed');
        }
      },
      error: (err) => {
        console.error('Checkout error:', err);
        this.showToast('Checkout failed');
      }
    });
  }

  // Search filter products
  filterProducts() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredProducts = [...this.products];
    } else {
      this.filteredProducts = this.products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
  }

  // Toggle search bar visibility
  toggleSearch() {
    this.showSearchBar = !this.showSearchBar;
    if (!this.showSearchBar) {
      this.searchQuery = '';
      this.filteredProducts = [...this.products];
    }
  }

  // ============ AUTH MODAL METHODS ============
  openAuthModal(mode: 'login' | 'signup') {
    this.authMode = mode;
    this.authEmail = this.authPassword = this.authName = this.authMessage = '';
    this.showAuthModal = true;
  }

  closeAuthModal() {
    this.showAuthModal = false;
    this.authMessage = '';
  }

  submitAuth() {
    if (this.authMode === 'login') {
      if (!this.authEmail || !this.authPassword) {
        this.authMessage = 'Fill all fields';
        return;
      }
      const success = this.authService.login(this.authEmail, this.authPassword);
      if (success) {
        this.loadUser();
        this.fetchCart();
        this.closeAuthModal();
        this.showToast(`Welcome ${this.currentUser.name}`);
      } else {
        this.authMessage = 'Invalid email or password';
      }
    } else {
      if (!this.authName || !this.authEmail || !this.authPassword) {
        this.authMessage = 'Fill all fields';
        return;
      }
      const success = this.authService.signup(this.authName, this.authEmail, this.authPassword);
      if (success) {
        this.loadUser();
        this.closeAuthModal();
        this.showToast('Account created!');
      } else {
        this.authMessage = 'Email already exists';
      }
    }
  }

  logout() {
    this.authService.logout();
    this.currentUser = null;
    this.cart = [];
    this.cartTotal = 0;
    this.activeTab = 'products';
    this.showToast('Logged out');
  }

  // Show toast message (Native Feature for Lab Exam)
  private showToast(msg: string) {
    const toast = document.createElement('ion-toast');
    toast.message = msg;
    toast.duration = 2000;
    document.body.appendChild(toast);
    toast.present();
    toast.onDidDismiss().then(() => toast.remove());
  }

  // Get star icons for rating display
  getStars(rating: number): string[] {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) stars.push('star');
      else if (i - 0.5 <= rating) stars.push('star-half');
      else stars.push('star-outline');
    }
    return stars;
  }
}