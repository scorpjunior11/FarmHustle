import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    // Subtle shadow layout
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  truckIconContainer: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginRight: 12,
  },
  routeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F5F5F5',
    paddingVertical: 12,
    marginBottom: 12,
  },
  detailColumn: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 6,
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueIcon: {
    marginRight: 6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#222',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    marginRight: 4,
  },
  postedText: {
    fontSize: 12,
    color: '#757575',
  },
  acceptButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});