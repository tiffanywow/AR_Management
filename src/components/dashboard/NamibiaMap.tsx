import { useState, useEffect, useRef } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { supabase } from '@/lib/supabase';

const GOOGLE_MAPS_API_KEY = 'AIzaSyC5EXSFu-wklG3S6W8QNg7EQFt8VL4wNMA';

const namibianRegions: { [key: string]: { lat: number; lng: number } } = {
  'Khomas': { lat: -22.5609, lng: 17.0658 },
  'Erongo': { lat: -22.5, lng: 14.5 },
  'Oshana': { lat: -18.0, lng: 15.9 },
  'Otjozondjupa': { lat: -20.0, lng: 17.5 },
  'Omaheke': { lat: -21.5, lng: 19.0 },
  'Hardap': { lat: -24.0, lng: 18.0 },
  'Kharas': { lat: -27.0, lng: 18.0 },
  'Kunene': { lat: -19.5, lng: 14.0 },
  'Omusati': { lat: -18.0, lng: 15.0 },
  'Oshikoto': { lat: -18.5, lng: 17.0 },
  'Ohangwena': { lat: -17.5, lng: 17.5 },
  'Kavango East': { lat: -18.0, lng: 20.0 },
  'Kavango West': { lat: -18.5, lng: 19.0 },
  'Zambezi': { lat: -17.5, lng: 24.0 },
};

interface RegionData {
  region: string;
  lat: number;
  lng: number;
  members: number;
}

interface MapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  onLoad?: (map: google.maps.Map) => void;
}

const MapComponent = ({ center, zoom, onLoad }: MapComponentProps) => {
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
          {
            featureType: 'administrative',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }],
          },
        ],
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      setMap(newMap);
      onLoad?.(newMap);
    }
  }, [ref, map, center, zoom, onLoad]);

  return <div ref={ref} className="w-full h-full rounded-lg overflow-hidden" />;
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#d1242a] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="w-full h-96 flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
          <div className="text-center">
            <p className="text-sm text-red-600">Failed to load map</p>
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default function NamibiaMap() {
  const [selectedLocation, setSelectedLocation] = useState<RegionData | null>(null);
  const [regionData, setRegionData] = useState<RegionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegionData();
  }, []);

  const fetchRegionData = async () => {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('region');

      if (error) throw error;

      const regionCounts: { [key: string]: number } = {};

      (data || []).forEach((membership: any) => {
        const region = membership.region || 'Unknown';
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      });

      const mappedData: RegionData[] = Object.entries(regionCounts)
        .filter(([region]) => namibianRegions[region])
        .map(([region, count]) => ({
          region,
          lat: namibianRegions[region].lat,
          lng: namibianRegions[region].lng,
          members: count,
        }));

      setRegionData(mappedData);
    } catch (error) {
      console.error('Error fetching region data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onLoad = (map: google.maps.Map) => {
    if (regionData.length === 0) return;

    const maxMembers = Math.max(...regionData.map(r => r.members));
    const minSize = 20;
    const maxSize = 50;

    regionData.forEach((location) => {
      const size = minSize + (location.members / maxMembers) * (maxSize - minSize);

      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2,
          fillColor: '#d1242a',
          fillOpacity: 0.7,
          strokeColor: '#d1242a',
          strokeWeight: 2,
        },
        title: `${location.region}: ${location.members.toLocaleString()} members`,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3">
            <h3 class="font-semibold text-gray-900">${location.region}</h3>
            <p class="text-sm text-gray-600">${location.region} Region</p>
            <p class="text-lg font-medium text-[#d1242a]">${location.members.toLocaleString()} members</p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        setSelectedLocation(location);
      });

      marker.addListener('mouseover', () => {
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2 + 3,
          fillColor: '#d1242a',
          fillOpacity: 0.9,
          strokeColor: '#d1242a',
          strokeWeight: 3,
        });
      });

      marker.addListener('mouseout', () => {
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2,
          fillColor: '#d1242a',
          fillOpacity: 0.7,
          strokeColor: '#d1242a',
          strokeWeight: 2,
        });
      });
    });

    if (window.google.maps.visualization && regionData.length > 0) {
      const heatmapData = regionData.map(location => ({
        location: new google.maps.LatLng(location.lat, location.lng),
        weight: location.members / 100,
      }));

      new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map,
        radius: 50,
        opacity: 0.3,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(0, 0, 223, 1)',
          'rgba(0, 0, 191, 1)',
          'rgba(0, 0, 159, 1)',
          'rgba(0, 0, 127, 1)',
          'rgba(63, 0, 91, 1)',
          'rgba(127, 0, 63, 1)',
          'rgba(191, 0, 31, 1)',
          'rgba(209, 36, 42, 1)',
        ],
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#d1242a] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96">
      {regionData.length > 0 ? (
        <>
          <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render} libraries={['visualization']}>
            <MapComponent
              center={{ lat: -22.5609, lng: 17.0658 }}
              zoom={6}
              onLoad={onLoad}
            />
          </Wrapper>

          {selectedLocation && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedLocation.region}</h4>
                  <p className="text-sm text-gray-600">{selectedLocation.region} Region</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-[#d1242a]">
                    {selectedLocation.members.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">members</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">No member location data available</p>
        </div>
      )}
    </div>
  );
}
