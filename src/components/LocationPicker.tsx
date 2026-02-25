import { useEffect, useRef, useState, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface LocationPickerProps {
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    locationName: string;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    locationName: string;
  } | null;
}

interface MapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  onMapLoad: (map: google.maps.Map) => void;
}

const MapComponent = ({ center, zoom, onMapLoad }: MapComponentProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        styles: [
          {
            featureType: 'all',
            elementType: 'geometry.fill',
            stylers: [{ color: '#f8fafc' }],
          },
          {
            featureType: 'all',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#e2e8f0' }, { weight: 1 }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#cbd5e1' }],
          },
          {
            featureType: 'landscape',
            elementType: 'geometry',
            stylers: [{ color: '#f1f5f9' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ visibility: 'simplified' }, { color: '#e2e8f0' }],
          },
        ],
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
        fullscreenControl: false,
      });

      setMap(newMap);
      onMapLoad(newMap);
    }
  }, []);

  return <div ref={ref} className="w-full h-full rounded-lg overflow-hidden" />;
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#d1242a] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="w-full h-[400px] flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
          <div className="text-center">
            <p className="text-sm font-medium text-red-600 mb-2">Failed to load Google Maps</p>
            <p className="text-xs text-red-500">
              {!GOOGLE_MAPS_API_KEY
                ? 'Google Maps API key is missing. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.'
                : 'Please check your API key and ensure it has the necessary permissions.'}
            </p>
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    locationName: string;
  } | null>(initialLocation || null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const getLocationName = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });

      if (response.results && response.results.length > 0) {
        return response.results[0].formatted_address;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Error getting location name:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }, []);

  const addMarker = useCallback(async (lat: number, lng: number) => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: mapRef.current,
      draggable: true,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#d1242a',
        fillOpacity: 0.9,
        strokeColor: '#991b1f',
        strokeWeight: 2,
      },
    });

    marker.addListener('dragend', async (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const locationName = await getLocationName(lat, lng);
        const location = { latitude: lat, longitude: lng, locationName };
        setCurrentLocation(location);
        onLocationSelect(location);
      }
    });

    markerRef.current = marker;
  }, [getLocationName, onLocationSelect]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    if (initialLocation && initialLocation.latitude && initialLocation.longitude) {
      addMarker(initialLocation.latitude, initialLocation.longitude);
    }

    map.addListener('click', async (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        await addMarker(lat, lng);
        const locationName = await getLocationName(lat, lng);
        const location = { latitude: lat, longitude: lng, locationName };
        setCurrentLocation(location);
        onLocationSelect(location);
      }
    });
  }, [addMarker, getLocationName, initialLocation, onLocationSelect]);

  const handleSearch = useCallback(async () => {
    if (!mapRef.current || !searchQuery.trim()) return;

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({
        address: searchQuery,
        componentRestrictions: { country: 'NA' }
      });

      if (response.results && response.results.length > 0) {
        const location = response.results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();

        mapRef.current.setCenter({ lat, lng });
        mapRef.current.setZoom(12);

        await addMarker(lat, lng);
        const locationName = response.results[0].formatted_address;
        const newLocation = { latitude: lat, longitude: lng, locationName };
        setCurrentLocation(newLocation);
        onLocationSelect(newLocation);
      }
    } catch (error) {
      console.error('Error searching location:', error);
    }
  }, [addMarker, searchQuery, onLocationSelect]);

  const center = initialLocation && initialLocation.latitude && initialLocation.longitude
    ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
    : { lat: -22.5609, lng: 17.0658 };

  const zoom = initialLocation && initialLocation.latitude && initialLocation.longitude ? 12 : 6;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Search Location</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search for a location in Namibia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button type="button" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </div>

      <div className="w-full h-[400px]">
        <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render} libraries={['visualization']}>
          <MapComponent
            center={center}
            zoom={zoom}
            onMapLoad={handleMapLoad}
          />
        </Wrapper>
      </div>

      {currentLocation && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div><strong>Selected Location:</strong> {currentLocation.locationName}</div>
          <div className="text-xs mt-1 text-gray-500">
            Lat: {currentLocation.latitude.toFixed(6)}, Lng: {currentLocation.longitude.toFixed(6)}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Click on the map to select a location, or drag the marker to adjust
      </p>
    </div>
  );
}
