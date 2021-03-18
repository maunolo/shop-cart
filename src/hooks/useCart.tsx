import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartProduct = cart.find(product => product.id === productId)

      if (cartProduct) {
        const newAmount = cartProduct.amount + 1

        updateProductAmount({ productId, amount: newAmount })
      } else {
        await api.get('/products/' + productId).then(response => {
          const newProduct = { ...response.data, amount: 1 }
          const newCart = [...cart, newProduct]
          setCart(newCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        })
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId)
      if (productInCart) {
        const newCart = [...cart.filter(product => productInCart.id !== product.id)]
        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount > 0) {
      try {
        await api.get('/stock/' + productId).then(response => {
          const stockAmount = response.data.amount

          if (stockAmount >= amount) {
            const newCard = cart.map(product => (
              product.id === productId ?
                {...product, amount: amount}
              : 
                {...product}
            ))
            setCart(newCard);
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCard));
          } else {
            throw new Error('Out of stock')
          }
        })
      } catch(e) {
        if (e.message === 'Out of stock') {
          toast.error('Quantidade solicitada fora de estoque');
        } else {
          toast.error('Erro na alteração de quantidade do produto');
        }
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
