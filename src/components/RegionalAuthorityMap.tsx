import { useEffect, useRef, useState, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface RegionalAuthority {
  id: string;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
}

interface Candidate {
  id: string;
  full_name: string;
  position: string | null;
  party_affiliation: string | null;
  photo_url: string | null;
}

interface RegionalAuthorityMapProps {
  authorities: RegionalAuthority[];
  candidates: Record<string, Candidate[]>;
  onAuthorityClick?: (authorityId: string) => void;
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
        fullscreenControl: true,
        zoomControl: true,
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
        <div className="w-full h-[500px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#d1242a] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="w-full h-[500px] flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
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

export default function RegionalAuthorityMap({
  authorities,
  candidates,
  onAuthorityClick
}: RegionalAuthorityMapProps) {
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const updateMarkers = useCallback((map: google.maps.Map) => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const authoritiesWithLocation = authorities.filter(
      auth => auth.latitude && auth.longitude
    );

    authoritiesWithLocation.forEach(authority => {
      if (!authority.latitude || !authority.longitude) return;

      const marker = new google.maps.Marker({
        position: { lat: authority.latitude, lng: authority.longitude },
        map: map,
        title: authority.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#d1242a',
          fillOpacity: 0.9,
          strokeColor: '#991b1f',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        if (onAuthorityClick) {
          onAuthorityClick(authority.id);
        }

        const authorityCandidates = candidates[authority.id] || [];
        const candidatesList = authorityCandidates.length > 0
          ? `
            <div style="margin-top: 12px;">
              <h4 style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">Candidates (${authorityCandidates.length})</h4>
              <div style="max-height: 200px; overflow-y: auto;">
                ${authorityCandidates.slice(0, 5).map(candidate => `
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px; background: #f9fafb; border-radius: 4px;">
                    ${candidate.photo_url
                      ? `<img src="${candidate.photo_url}" alt="${candidate.full_name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />`
                      : '<div style="width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb;"></div>'
                    }
                    <div style="flex: 1;">
                      <div style="font-weight: 500; font-size: 13px;">${candidate.full_name}</div>
                      ${candidate.position ? `<div style="font-size: 11px; color: #6b7280;">${candidate.position}</div>` : ''}
                      ${candidate.party_affiliation ? `<div style="font-size: 11px; color: #6b7280;">${candidate.party_affiliation}</div>` : ''}
                    </div>
                  </div>
                `).join('')}
                ${authorityCandidates.length > 5 ? `<div style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 4px;">+${authorityCandidates.length - 5} more candidates</div>` : ''}
              </div>
            </div>
          `
          : '<div style="margin-top: 8px; font-size: 13px; color: #6b7280;">No candidates yet</div>';

        const content = `
          <div style="padding: 8px; min-width: 250px; max-width: 350px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">${authority.name}</h3>
            ${authority.location_name ? `<div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;"><strong>Location:</strong> ${authority.location_name}</div>` : ''}
            ${authority.description ? `<div style="font-size: 13px; color: #4b5563; margin-top: 8px;">${authority.description}</div>` : ''}
            ${candidatesList}
          </div>
        `;

        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersRef.current.push(marker);
    });

    if (authoritiesWithLocation.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      authoritiesWithLocation.forEach(auth => {
        if (auth.latitude && auth.longitude) {
          bounds.extend({ lat: auth.latitude, lng: auth.longitude });
        }
      });
      map.fitBounds(bounds);
    }
  }, [authorities, candidates, onAuthorityClick]);

  const handleMapLoad = (map: google.maps.Map) => {
    googleMapRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();
    updateMarkers(map);
  };

  useEffect(() => {
    if (googleMapRef.current) {
      updateMarkers(googleMapRef.current);
    }
  }, [updateMarkers]);

  return (
    <div className="w-full">
      <div className="w-full h-[500px]">
        <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render} libraries={['visualization']}>
          <MapComponent
            center={{ lat: -22.5609, lng: 17.0658 }}
            zoom={6}
            onMapLoad={handleMapLoad}
          />
        </Wrapper>
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#d1242a] border-2 border-[#991b1f]"></div>
          <span>Regional Authority</span>
        </div>
        <div className="text-xs text-gray-500">
          Click on markers to view details and candidates
        </div>
      </div>
    </div>
  );
}
