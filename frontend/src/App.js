import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import AddProduct from "./pages/AddProduct";
import Categories from "./pages/Categories";
import ImageManager from "./pages/ImageManager";
import ImportExport from "./pages/ImportExport";
import CatalogView from "./pages/CatalogView";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<AddProduct />} />
            <Route path="/products/:id/edit" element={<AddProduct />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/images" element={<ImageManager />} />
            <Route path="/import-export" element={<ImportExport />} />
            <Route path="/catalog" element={<CatalogView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
