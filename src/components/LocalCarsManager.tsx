"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "../lib/supabase";
import styles from "../app/login/page.module.css"; // Reuse some basic styles or inline

type LocalCar = {
  id: string;
  title: string;
  image_url: string;
  registration_year?: number | null;
  mileage_km?: number | null;
  fuel_type?: string | null;
  created_at: string;
};

export default function LocalCarsManager() {
  const [cars, setCars] = useState<LocalCar[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState("Diesel");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editMileage, setEditMileage] = useState("");
  const [editFuelType, setEditFuelType] = useState("Diesel");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editUploading, setEditUploading] = useState(false);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('local_cars')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCars(data);
    }
    setLoading(false);
  };

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) {
      setError("Ju lutem plotësoni titullin dhe zgjidhni foton.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    setError(null);
    setUploading(true);

    try {
      // 1. Upload Image
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `cars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('local_car_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('local_car_images')
        .getPublicUrl(filePath);

      // 3. Insert into DB
      const { error: insertError } = await supabase
        .from('local_cars')
        .insert([{ 
          title, 
          image_url: publicUrl,
          registration_year: year ? parseInt(year, 10) : null,
          mileage_km: mileage ? parseInt(mileage, 10) : null,
          fuel_type: fuelType || null
        }]);

      if (insertError) throw insertError;

      // Reset form
      setTitle("");
      setYear("");
      setMileage("");
      setFuelType("Diesel");
      setFile(null);
      // Refresh list
      fetchCars();

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ndodhi një gabim gjatë ruajtjes.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = async (car: LocalCar) => {
    if (!editTitle) {
      alert("Titulli nuk mund të jetë bosh.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    setEditUploading(true);
    try {
      let finalImageUrl = car.image_url;

      if (editFile) {
        const fileExt = editFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `cars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('local_car_images')
          .upload(filePath, editFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('local_car_images')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;

        // Optionally delete old image
        const fileNameMatch = car.image_url.match(/local_car_images\/(cars\/.*)$/);
        if (fileNameMatch) {
          await supabase.storage.from('local_car_images').remove([fileNameMatch[1]]);
        }
      }

      const { error: updateError } = await supabase
        .from('local_cars')
        .update({ 
          title: editTitle, 
          image_url: finalImageUrl,
          registration_year: editYear ? parseInt(editYear, 10) : null,
          mileage_km: editMileage ? parseInt(editMileage, 10) : null,
          fuel_type: editFuelType || null
        })
        .eq('id', car.id);

      if (updateError) throw updateError;

      setEditingId(null);
      setEditFile(null);
      fetchCars();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Ndodhi një gabim gjatë përditësimit.");
    } finally {
      setEditUploading(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!window.confirm("A jeni i sigurt që doni ta fshini këtë makinë?")) return;

    const supabase = getSupabase();
    if (!supabase) return;

    // Optional: Delete image from storage as well
    const fileNameMatch = imageUrl.match(/local_car_images\/(cars\/.*)$/);
    if (fileNameMatch) {
      await supabase.storage.from('local_car_images').remove([fileNameMatch[1]]);
    }

    const { error } = await supabase
      .from('local_cars')
      .delete()
      .eq('id', id);

    if (!error) {
      setCars(cars.filter(c => c.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <section style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 700, color: '#111827' }}>
          Shto Makinë të Re në Stok
        </h2>

        <form onSubmit={handleAddCar} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                Titulli i makinës (p.sh. BMW 520d)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' }}
                placeholder="Shkruaj emrin..."
              />
            </div>
            
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                Viti
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' }}
                placeholder="p.sh. 2020"
              />
            </div>

            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                Kilometrazha
              </label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' }}
                placeholder="p.sh. 50000"
              />
            </div>

            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                Karburanti
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: '15px' }}
              >
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
                <option value="Elektrik">Elektrik</option>
                <option value="Hibrid">Hibrid</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
              Fotoja e makinës
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}
            />
          </div>

          {error && <div style={{ color: '#991b1b', background: '#fee2e2', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
              type="submit"
              disabled={uploading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#076fe6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.7 : 1,
                minWidth: '160px'
              }}
            >
              {uploading ? 'Duke e ngarkuar...' : 'Shto Makinën'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>
          Makinat e regjistruara në Stock (Pejë)
        </h2>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Duke i ngarkuar makinat...</div>
        ) : cars.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#6b7280' }}>
            Nuk keni asnjë makinë në stok.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {cars.map((car) => (
              <article key={car.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ height: '200px', width: '100%', backgroundColor: '#f3f4f6', position: 'relative' }}>
                  <img src={car.image_url} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {!editingId && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                      {car.registration_year || "---"}
                    </div>
                  )}
                </div>
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {editingId === car.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                        placeholder="Titulli"
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          value={editYear}
                          onChange={(e) => setEditYear(e.target.value)}
                          style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: 0 }}
                          placeholder="Viti"
                        />
                        <input
                          type="number"
                          value={editMileage}
                          onChange={(e) => setEditMileage(e.target.value)}
                          style={{ flex: 2, padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: 0 }}
                          placeholder="Kilometrazha"
                        />
                      </div>
                      <select
                        value={editFuelType}
                        onChange={(e) => setEditFuelType(e.target.value)}
                        style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff', fontSize: '14px' }}
                      >
                        <option value="Diesel">Diesel</option>
                        <option value="Petrol">Petrol</option>
                        <option value="Elektrik">Elektrik</option>
                        <option value="Hibrid">Hibrid</option>
                      </select>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                        style={{ fontSize: '13px', marginTop: '4px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                          onClick={() => handleSaveEdit(car)}
                          disabled={editUploading}
                          style={{ flex: 1, padding: '8px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          {editUploading ? '...' : 'Ruaj'}
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditFile(null); }}
                          disabled={editUploading}
                          style={{ flex: 1, padding: '8px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Anulo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{car.title}</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                        {car.registration_year && (
                          <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#4b5563', fontWeight: 500 }}>
                            {car.registration_year}
                          </span>
                        )}
                        {car.mileage_km != null && (
                          <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#4b5563', fontWeight: 500 }}>
                            {new Intl.NumberFormat('en-US').format(car.mileage_km)} km
                          </span>
                        )}
                        {car.fuel_type && (
                          <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#4b5563', fontWeight: 500 }}>
                            {car.fuel_type}
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <button
                          onClick={() => { 
                            setEditingId(car.id); 
                            setEditTitle(car.title); 
                            setEditYear(car.registration_year?.toString() || "");
                            setEditMileage(car.mileage_km?.toString() || "");
                            setEditFuelType(car.fuel_type || "Diesel");
                            setEditFile(null); 
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: 'white',
                            color: '#076fe6',
                            border: '1px solid #076fe6',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            transition: 'all 0.15s'
                          }}
                        >
                          Ndrysho
                        </button>
                        <button
                          onClick={() => handleDelete(car.id, car.image_url)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: 'white',
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            transition: 'all 0.15s'
                          }}
                        >
                          Fshije
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
